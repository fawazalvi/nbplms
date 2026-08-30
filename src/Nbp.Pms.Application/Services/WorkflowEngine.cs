using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Application.Interfaces;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;

namespace Nbp.Pms.Application.Services;

public record TransitionResult(
    bool Success,
    string Message,
    WorkflowStatus PreviousStatus,
    WorkflowStatus NewStatus,
    AuditEvent? AuditLog
);

public class WorkflowEngine
{
    private readonly IPmsDbContext _db;
    private readonly IEmailService _emailService;

    public WorkflowEngine(IPmsDbContext db, IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

    public TransitionResult Transition(
        EmployeeCycle employeeCycle,
        WorkflowStatus targetStatus,
        string actorUserId,
        string actorRole,
        string? comments = null,
        string? ipAddress = null
    )
    {
        var current = employeeCycle.CurrentStatus;

        // Valid transition matrix check
        if (!IsValidTransition(current, targetStatus, actorRole, comments, out var errorMessage))
        {
            return new TransitionResult(false, errorMessage, current, current, null);
        }

        // Apply transition
        employeeCycle.CurrentStatus = targetStatus;
        employeeCycle.UpdatedAt = DateTime.UtcNow;

        if (targetStatus == WorkflowStatus.ObjectiveSubmitted)
        {
            employeeCycle.SubmittedAt = DateTime.UtcNow;
        }
        else if (targetStatus == WorkflowStatus.ObjectiveApproved)
        {
            employeeCycle.ApprovedAt = DateTime.UtcNow;
        }
        else if (targetStatus == WorkflowStatus.Published)
        {
            employeeCycle.PublishedAt = DateTime.UtcNow;
        }
        else if (targetStatus == WorkflowStatus.EmployeeAgreed || targetStatus == WorkflowStatus.EmployeeDisagreed)
        {
            employeeCycle.AcknowledgedAt = DateTime.UtcNow;
        }

        // Generate Mandatory Audit Event
        var audit = new AuditEvent
        {
            EventType = $"WORKFLOW_TRANSITION_{current}_TO_{targetStatus}",
            ActorUserId = actorUserId,
            ActorRole = actorRole,
            TargetEntityId = employeeCycle.Id.ToString(),
            TargetEntityType = nameof(EmployeeCycle),
            PreStatus = current.ToString(),
            PostStatus = targetStatus.ToString(),
            ActionDescription = $"Transitioned from {current} to {targetStatus}",
            JustificationComments = comments,
            IpAddress = ipAddress,
            Timestamp = DateTime.UtcNow
        };

        return new TransitionResult(true, "Transition successful", current, targetStatus, audit);
    }

    private static bool IsValidTransition(
        WorkflowStatus from,
        WorkflowStatus to,
        string role,
        string? comments,
        out string errorMessage
    )
    {
        errorMessage = string.Empty;

        // 1. Employee Objective Submission
        if (from == WorkflowStatus.ObjectiveDraft && to == WorkflowStatus.ObjectiveSubmitted)
        {
            if (role != "Employee" && role != "PmwAdmin" && role != "PmwSuperAdmin")
            {
                errorMessage = "Only the employee or PMW Admin can submit objectives.";
                return false;
            }
            return true;
        }

        // 2. Return Objectives to Employee
        if (from == WorkflowStatus.ObjectiveSubmitted && to == WorkflowStatus.ObjectiveReturned)
        {
            if (string.IsNullOrWhiteSpace(comments))
            {
                errorMessage = "Mandatory comments are required when returning objectives.";
                return false;
            }
            return true;
        }

        // 3. First Appraiser Objective Approval
        if (from == WorkflowStatus.ObjectiveSubmitted && to == WorkflowStatus.ObjectiveApproved)
        {
            if (role != "FirstAppraiser" && role != "PmwAdmin" && role != "PmwSuperAdmin")
            {
                errorMessage = "Only the First Appraiser or PMW Admin can approve objectives.";
                return false;
            }
            return true;
        }

        // 4. Move to Self Assessment
        if (from == WorkflowStatus.ObjectiveApproved && to == WorkflowStatus.AnnualReviewSelfAssessment)
        {
            return true;
        }

        // 5. Submit Self Assessment to First Appraiser Assessment (Supports combined Objective/Achievement submission)
        if ((from == WorkflowStatus.AnnualReviewSelfAssessment || from == WorkflowStatus.ObjectiveDraft) && to == WorkflowStatus.FirstAppraiserAssessment)
        {
            if (role != "Employee" && role != "PmwAdmin" && role != "PmwSuperAdmin")
            {
                errorMessage = "Only the employee can submit the self assessment.";
                return false;
            }
            return true;
        }

        // 6. First Appraiser to Second Appraiser OR CoAppraiser
        if (from == WorkflowStatus.FirstAppraiserAssessment && (to == WorkflowStatus.SecondAppraiserReview || to == WorkflowStatus.CoAppraiserReview))
        {
            if (role != "FirstAppraiser" && role != "PmwAdmin" && role != "PmwSuperAdmin")
            {
                errorMessage = "Only First Appraiser can forward assessment.";
                return false;
            }
            return true;
        }

        // 6b. CoAppraiser to Second Appraiser
        if (from == WorkflowStatus.CoAppraiserReview && to == WorkflowStatus.SecondAppraiserReview)
        {
            if (role != "CoAppraiser" && role != "PmwAdmin" && role != "PmwSuperAdmin")
            {
                errorMessage = "Only Co-Appraiser can forward assessment to Second Appraiser.";
                return false;
            }
            return true;
        }

        // 7. Second Appraiser to GPM Review
        if (from == WorkflowStatus.SecondAppraiserReview && to == WorkflowStatus.GroupPerformanceManagerReview)
        {
            if (role != "SecondAppraiser" && role != "PmwAdmin" && role != "PmwSuperAdmin")
            {
                errorMessage = "Only Second Appraiser can countersign.";
                return false;
            }
            return true;
        }

        // 8. GPM Review to PMW Finalization
        if (from == WorkflowStatus.GroupPerformanceManagerReview && to == WorkflowStatus.PmwFinalization)
        {
            if (role != "GroupPerformanceManager" && role != "PmwAdmin" && role != "PmwSuperAdmin")
            {
                errorMessage = "Only GPM or PMW Admin can finalize group review.";
                return false;
            }
            return true;
        }

        // 9. PMW Finalization to Published
        if (from == WorkflowStatus.PmwFinalization && to == WorkflowStatus.Published)
        {
            if (role != "PmwAdmin" && role != "PmwSuperAdmin")
            {
                errorMessage = "Only PMW Admins can publish final results.";
                return false;
            }
            return true;
        }

        // 10. Publication Acknowledgement: Agree
        if (from == WorkflowStatus.Published && to == WorkflowStatus.EmployeeAgreed)
        {
            if (role != "Employee")
            {
                errorMessage = "Only the employee can acknowledge agreement.";
                return false;
            }
            return true;
        }

        // 11. Publication Acknowledgement: Disagree (Mandatory comments required)
        if (from == WorkflowStatus.Published && to == WorkflowStatus.EmployeeDisagreed)
        {
            if (role != "Employee")
            {
                errorMessage = "Only the employee can record disagreement.";
                return false;
            }
            if (string.IsNullOrWhiteSpace(comments))
            {
                errorMessage = "Mandatory justification comments are required when recording disagreement.";
                return false;
            }
            return true;
        }

        // 12. Administrative Completion (Deadline expiry override — NEVER recorded as agreement)
        if (from == WorkflowStatus.Published && to == WorkflowStatus.AdministrativelyCompleted)
        {
            if (role != "GroupPerformanceManager" && role != "PmwAdmin" && role != "PmwSuperAdmin")
            {
                errorMessage = "Only GPM or PMW Admin can administratively complete an appraisal.";
                return false;
            }
            return true;
        }

        // 13. PMW Administrative Reopen / Reset
        if (role == "PmwAdmin" || role == "PmwSuperAdmin")
        {
            return true; // PMW administrative override capability
        }

        errorMessage = $"Invalid status transition from {from} to {to}.";
        return false;
    }

    /// <summary>
    /// Dispatches email notifications asynchronously based on configured workflow rules.
    /// Should be called AFTER the database transaction commits the status change.
    /// </summary>
    public async Task DispatchNotificationsAsync(EmployeeCycle employeeCycle, WorkflowStatus previousStatus, WorkflowStatus newStatus)
    {
        var transitionKey = $"{previousStatus}->{newStatus}";
        
        var config = await _db.WorkflowNotificationConfigs
            .FirstOrDefaultAsync(c => c.TransitionKey == transitionKey);

        string notifyRolesString;
        if (config != null)
        {
            if (!config.IsEnabled || string.IsNullOrWhiteSpace(config.NotifyRoles))
            {
                Console.WriteLine($"[WORKFLOW NOTIFY] Notifications disabled for {transitionKey}");
                return;
            }
            notifyRolesString = config.NotifyRoles;
        }
        else
        {
            // Default smart role mappings if no custom configuration has been saved yet
            notifyRolesString = transitionKey switch
            {
                "ObjectiveDraft->FirstAppraiserAssessment" => "Employee,FirstAppraiser",
                "AnnualReviewSelfAssessment->FirstAppraiserAssessment" => "Employee,FirstAppraiser",
                "FirstAppraiserAssessment->SecondAppraiserReview" => "Employee,FirstAppraiser,SecondAppraiser",
                "FirstAppraiserAssessment->CoAppraiserReview" => "Employee,FirstAppraiser,CoAppraiser",
                "CoAppraiserReview->SecondAppraiserReview" => "Employee,CoAppraiser,SecondAppraiser",
                "SecondAppraiserReview->GroupPerformanceManagerReview" => "Employee,SecondAppraiser,GroupPerformanceManager",
                "GroupPerformanceManagerReview->PmwFinalization" => "Employee,GroupPerformanceManager,PmwAdmin",
                "PmwFinalization->Published" => "Employee,FirstAppraiser,SecondAppraiser",
                "Published->EmployeeAgreed" => "Employee,FirstAppraiser,SecondAppraiser",
                "Published->EmployeeDisagreed" => "Employee,FirstAppraiser,GroupPerformanceManager",
                _ => "Employee,FirstAppraiser,SecondAppraiser"
            };
            Console.WriteLine($"[WORKFLOW NOTIFY] Using default notification routing for {transitionKey}: {notifyRolesString}");
        }

        // 1. Ensure Employee details are loaded
        if (employeeCycle.Employee == null && employeeCycle.EmployeeId != Guid.Empty)
        {
            employeeCycle.Employee = await _db.Employees.FindAsync(employeeCycle.EmployeeId);
        }
        
        // 2. Ensure Cycle details are loaded
        if (employeeCycle.Cycle == null && employeeCycle.CycleId != Guid.Empty)
        {
            employeeCycle.Cycle = await _db.AppraisalCycles.FindAsync(employeeCycle.CycleId);
        }

        // 3. Ensure Appraisers are loaded
        if (employeeCycle.FirstAppraiser == null && employeeCycle.FirstAppraiserId.HasValue)
        {
            employeeCycle.FirstAppraiser = await _db.Employees.FindAsync(employeeCycle.FirstAppraiserId.Value);
        }
        if (employeeCycle.FirstAppraiser == null && employeeCycle.Employee?.FirstAppraiserId.HasValue == true)
        {
            employeeCycle.FirstAppraiser = await _db.Employees.FindAsync(employeeCycle.Employee.FirstAppraiserId.Value);
        }

        if (employeeCycle.SecondAppraiser == null && employeeCycle.SecondAppraiserId.HasValue)
        {
            employeeCycle.SecondAppraiser = await _db.Employees.FindAsync(employeeCycle.SecondAppraiserId.Value);
        }
        if (employeeCycle.SecondAppraiser == null && employeeCycle.Employee?.SecondAppraiserId.HasValue == true)
        {
            employeeCycle.SecondAppraiser = await _db.Employees.FindAsync(employeeCycle.Employee.SecondAppraiserId.Value);
        }

        if (employeeCycle.CoAppraiser == null && employeeCycle.CoAppraiserId.HasValue)
        {
            employeeCycle.CoAppraiser = await _db.Employees.FindAsync(employeeCycle.CoAppraiserId.Value);
        }

        var employeeName = employeeCycle.Employee?.FullName ?? "NBP Employee";
        var employeeSapId = employeeCycle.Employee?.SapId ?? "N/A";
        var employeeGrade = employeeCycle.Employee?.Grade ?? "N/A";
        var employeeDesignation = employeeCycle.Employee?.Designation ?? "Officer";
        var employeeBranch = employeeCycle.Employee?.RegionBranch ?? employeeCycle.Employee?.Location ?? "NBP Branch";
        var employeeGroup = employeeCycle.Employee?.ReportingGroup ?? employeeCycle.Employee?.Division ?? "General Banking";
        var cycleTitle = employeeCycle.Cycle?.Title ?? "Annual Appraisal Cycle 2026";

        var faEmployee = employeeCycle.FirstAppraiser ?? employeeCycle.Employee?.FirstAppraiser;
        var faName = faEmployee?.FullName ?? "Designated 1st Appraiser";
        var faSap = faEmployee?.SapId ?? "N/A";

        var saEmployee = employeeCycle.SecondAppraiser ?? employeeCycle.Employee?.SecondAppraiser;
        var saName = saEmployee?.FullName ?? "Designated 2nd Appraiser / Supervisor";
        var saSap = saEmployee?.SapId ?? "N/A";

        var caEmployee = employeeCycle.CoAppraiser ?? employeeCycle.Employee?.CoAppraiser;
        var caName = caEmployee?.FullName;
        var caSap = caEmployee?.SapId;

        // 4. Determine clear, non-technical workflow explanations
        var (subjectTemplate, stageHeadline, whatHappened, nextActionText, actionOwner) = GetWorkflowExplanation(previousStatus, newStatus, employeeName);

        var rolesToNotify = notifyRolesString.Split(',', StringSplitOptions.RemoveEmptyEntries);

        foreach (var role in rolesToNotify)
        {
            string? targetEmail = null;
            string? targetName = null;
            var cleanRole = role.Trim();

            switch (cleanRole)
            {
                case "Employee":
                    var empUser = await _db.SystemUsers.FirstOrDefaultAsync(u => u.Username == employeeSapId || (employeeCycle.EmployeeId != Guid.Empty && u.EmployeeId == employeeCycle.EmployeeId));
                    targetEmail = !string.IsNullOrWhiteSpace(empUser?.Email) ? empUser.Email : employeeCycle.Employee?.Email;
                    targetName = employeeName;
                    break;

                case "FirstAppraiser":
                    var faUser = await _db.SystemUsers.FirstOrDefaultAsync(u => u.Username == faSap || (faEmployee != null && u.EmployeeId == faEmployee.Id));
                    targetEmail = !string.IsNullOrWhiteSpace(faUser?.Email) ? faUser.Email : faEmployee?.Email;
                    targetName = faName;
                    break;

                case "SecondAppraiser":
                    var saUser = await _db.SystemUsers.FirstOrDefaultAsync(u => u.Username == saSap || (saEmployee != null && u.EmployeeId == saEmployee.Id));
                    targetEmail = !string.IsNullOrWhiteSpace(saUser?.Email) ? saUser.Email : saEmployee?.Email;
                    targetName = saName;
                    break;

                case "CoAppraiser":
                    var caUser = await _db.SystemUsers.FirstOrDefaultAsync(u => (caSap != null && u.Username == caSap) || (caEmployee != null && u.EmployeeId == caEmployee.Id));
                    targetEmail = !string.IsNullOrWhiteSpace(caUser?.Email) ? caUser.Email : caEmployee?.Email;
                    targetName = caName ?? "Co-Appraiser";
                    break;

                case "GroupPerformanceManager":
                    var gpmUser = await _db.SystemUsers.FirstOrDefaultAsync(u => u.Role == "GroupPerformanceManager" && !string.IsNullOrWhiteSpace(u.Email));
                    targetEmail = gpmUser?.Email ?? "gpm-commercial@nbp.com.pk";
                    targetName = gpmUser?.FullName ?? "Group Performance Manager";
                    break;

                case "PmwAdmin":
                case "PmwSuperAdmin":
                    var adminUser = await _db.SystemUsers.FirstOrDefaultAsync(u => (u.Role == "PmwSuperAdmin" || u.Role == "PmwAdmin") && !string.IsNullOrWhiteSpace(u.Email));
                    targetEmail = adminUser?.Email ?? "pmw-admin@nbp.com.pk";
                    targetName = adminUser?.FullName ?? "PMW Administrator";
                    break;
            }

            if (!string.IsNullOrWhiteSpace(targetEmail) && !string.IsNullOrWhiteSpace(targetName))
            {
                var subject = subjectTemplate;
                var htmlBody = BuildRichNotificationHtml(
                    recipientName: targetName,
                    stageHeadline: stageHeadline,
                    whatHappened: whatHappened,
                    nextActionText: nextActionText,
                    actionOwner: actionOwner,
                    employeeName: employeeName,
                    employeeSapId: employeeSapId,
                    employeeGrade: employeeGrade,
                    employeeDesignation: employeeDesignation,
                    employeeBranch: employeeBranch,
                    employeeGroup: employeeGroup,
                    cycleTitle: cycleTitle,
                    firstAppraiserName: faName,
                    firstAppraiserSap: faSap,
                    secondAppraiserName: saName,
                    secondAppraiserSap: saSap,
                    coAppraiserName: caName,
                    coAppraiserSap: caSap
                );

                Console.WriteLine($"[WORKFLOW NOTIFY] Sending '{subject}' to {targetName} ({targetEmail})...");
                await _emailService.SendWorkflowNotificationAsync(targetEmail, targetName, subject, htmlBody);
            }
        }
    }

    public async Task<bool> SendDirectNotificationAsync(EmployeeCycle employeeCycle, WorkflowStatus previousStatus, WorkflowStatus newStatus, string targetEmail, string? targetRecipientName = null)
    {
        if (employeeCycle.Employee == null && employeeCycle.EmployeeId != Guid.Empty)
        {
            employeeCycle.Employee = await _db.Employees.FindAsync(employeeCycle.EmployeeId);
        }
        if (employeeCycle.Cycle == null && employeeCycle.CycleId != Guid.Empty)
        {
            employeeCycle.Cycle = await _db.AppraisalCycles.FindAsync(employeeCycle.CycleId);
        }

        if (employeeCycle.FirstAppraiser == null && employeeCycle.FirstAppraiserId.HasValue)
        {
            employeeCycle.FirstAppraiser = await _db.Employees.FindAsync(employeeCycle.FirstAppraiserId.Value);
        }
        if (employeeCycle.FirstAppraiser == null && employeeCycle.Employee?.FirstAppraiserId.HasValue == true)
        {
            employeeCycle.FirstAppraiser = await _db.Employees.FindAsync(employeeCycle.Employee.FirstAppraiserId.Value);
        }

        if (employeeCycle.SecondAppraiser == null && employeeCycle.SecondAppraiserId.HasValue)
        {
            employeeCycle.SecondAppraiser = await _db.Employees.FindAsync(employeeCycle.SecondAppraiserId.Value);
        }
        if (employeeCycle.SecondAppraiser == null && employeeCycle.Employee?.SecondAppraiserId.HasValue == true)
        {
            employeeCycle.SecondAppraiser = await _db.Employees.FindAsync(employeeCycle.Employee.SecondAppraiserId.Value);
        }

        if (employeeCycle.CoAppraiser == null && employeeCycle.CoAppraiserId.HasValue)
        {
            employeeCycle.CoAppraiser = await _db.Employees.FindAsync(employeeCycle.CoAppraiserId.Value);
        }

        var employeeName = employeeCycle.Employee?.FullName ?? "NBP Employee";
        var employeeSapId = employeeCycle.Employee?.SapId ?? "N/A";
        var employeeGrade = employeeCycle.Employee?.Grade ?? "N/A";
        var employeeDesignation = employeeCycle.Employee?.Designation ?? "Officer";
        var employeeBranch = employeeCycle.Employee?.RegionBranch ?? employeeCycle.Employee?.Location ?? "NBP Branch";
        var employeeGroup = employeeCycle.Employee?.ReportingGroup ?? employeeCycle.Employee?.Division ?? "General Banking";
        var cycleTitle = employeeCycle.Cycle?.Title ?? "Annual Appraisal Cycle 2026";

        var faEmployee = employeeCycle.FirstAppraiser ?? employeeCycle.Employee?.FirstAppraiser;
        var faName = faEmployee?.FullName ?? "Designated 1st Appraiser";
        var faSap = faEmployee?.SapId ?? "N/A";

        var saEmployee = employeeCycle.SecondAppraiser ?? employeeCycle.Employee?.SecondAppraiser;
        var saName = saEmployee?.FullName ?? "Designated 2nd Appraiser / Supervisor";
        var saSap = saEmployee?.SapId ?? "N/A";

        var caEmployee = employeeCycle.CoAppraiser ?? employeeCycle.Employee?.CoAppraiser;
        var caName = caEmployee?.FullName;
        var caSap = caEmployee?.SapId;

        var (subject, stageHeadline, whatHappened, nextActionText, actionOwner) = GetWorkflowExplanation(previousStatus, newStatus, employeeName);
        var recipientDisplayName = targetRecipientName ?? employeeName;

        var htmlBody = BuildRichNotificationHtml(
            recipientName: recipientDisplayName,
            stageHeadline: stageHeadline,
            whatHappened: whatHappened,
            nextActionText: nextActionText,
            actionOwner: actionOwner,
            employeeName: employeeName,
            employeeSapId: employeeSapId,
            employeeGrade: employeeGrade,
            employeeDesignation: employeeDesignation,
            employeeBranch: employeeBranch,
            employeeGroup: employeeGroup,
            cycleTitle: cycleTitle,
            firstAppraiserName: faName,
            firstAppraiserSap: faSap,
            secondAppraiserName: saName,
            secondAppraiserSap: saSap,
            coAppraiserName: caName,
            coAppraiserSap: caSap
        );

        return await _emailService.SendWorkflowNotificationAsync(targetEmail.Trim(), recipientDisplayName, subject, htmlBody);
    }

    private static (string Subject, string StageHeadline, string WhatHappened, string NextActionText, string ActionOwner) GetWorkflowExplanation(WorkflowStatus previousStatus, WorkflowStatus newStatus, string employeeName)
    {
        var key = $"{previousStatus}->{newStatus}";

        return key switch
        {
            "ObjectiveDraft->ObjectiveSubmitted" or "ObjectiveDraft->FirstAppraiserAssessment" or "AnnualReviewSelfAssessment->FirstAppraiserAssessment" => (
                Subject: $"[NBP PMS 2.0] Self-Assessment Submitted: {employeeName}",
                StageHeadline: "Self-Assessment & Objectives Submitted for Review",
                WhatHappened: $"The appraisee ({employeeName}) has completed and officially submitted their annual performance appraisal self-assessment and objectives for evaluation.",
                NextActionText: "The 1st Appraiser is requested to log in to the NBP PMS Portal, review the submitted self-assessment and achievements, evaluate each objective and trait, record appraisal scores, and submit the appraisal forward.",
                ActionOwner: "1st Appraiser"
            ),

            "FirstAppraiserAssessment->SecondAppraiserReview" => (
                Subject: $"[NBP PMS 2.0] 1st Appraiser Review Completed: {employeeName}",
                StageHeadline: "1st Appraiser Evaluation Completed & Submitted",
                WhatHappened: $"The 1st Appraiser has evaluated the appraisal form, recorded individual scores and developmental feedback, and submitted the appraisal to the 2nd Appraiser / Supervisor for countersignature.",
                NextActionText: "The 2nd Appraiser / Countersigning Officer is requested to log in to the portal, review the 1st Appraiser's evaluation scores, add countersigning remarks, and forward the appraisal to Group Performance Management.",
                ActionOwner: "2nd Appraiser (Countersigning Officer)"
            ),

            "FirstAppraiserAssessment->CoAppraiserReview" => (
                Subject: $"[NBP PMS 2.0] Co-Appraiser Review Requested: {employeeName}",
                StageHeadline: "Appraisal Forwarded for Co-Appraiser Feedback",
                WhatHappened: $"The 1st Appraiser has forwarded this appraisal to the assigned Co-Appraiser for specialized functional input and feedback.",
                NextActionText: "The Co-Appraiser is requested to log in to the portal, review the appraisal objectives, and submit their evaluation comments and scores.",
                ActionOwner: "Co-Appraiser"
            ),

            "CoAppraiserReview->SecondAppraiserReview" or "CoAppraiserReview->FirstAppraiserAssessment" => (
                Subject: $"[NBP PMS 2.0] Co-Appraiser Feedback Submitted: {employeeName}",
                StageHeadline: "Co-Appraiser Input Received",
                WhatHappened: "The assigned Co-Appraiser has completed their assessment. The appraisal is now proceeding to the countersigning stage.",
                NextActionText: "The 2nd Appraiser / Supervisor is requested to inspect the co-appraisal feedback and complete the countersign review.",
                ActionOwner: "2nd Appraiser (Supervisor)"
            ),

            "SecondAppraiserReview->GroupPerformanceManagerReview" => (
                Subject: $"[NBP PMS 2.0] Appraisal Countersigned — Under GPM Review: {employeeName}",
                StageHeadline: "Appraiser Evaluations Completed — Forwarded to Group Management",
                WhatHappened: "Both First and Second Appraisers have completed their assessments and countersignatures. The appraisal has been forwarded for Group-level performance review.",
                NextActionText: "The Group Performance Manager (GPM) will review group-wide performance distributions and bell-curve alignment before submitting the batch to PMW Central HR.",
                ActionOwner: "Group Performance Manager (GPM)"
            ),

            "GroupPerformanceManagerReview->PmwFinalization" => (
                Subject: $"[NBP PMS 2.0] Group Review Approved — Under PMW Finalization: {employeeName}",
                StageHeadline: "Group Review Completed — Final PMW Calibration",
                WhatHappened: "Group Management has reviewed and endorsed the appraisal batch. The appraisal is now undergoing central verification by the Performance Management Wing (PMW).",
                NextActionText: "Central PMW Administrators will perform final quality checks, calibrate bank-wide ratings, and prepare the cycle for official publication.",
                ActionOwner: "PMW Central HR Administrators"
            ),

            "PmwFinalization->Published" => (
                Subject: $"[NBP PMS 2.0] Annual Appraisal Results Published: {employeeName}",
                StageHeadline: "Annual Appraisal Results Officially Published",
                WhatHappened: "The Central Performance Management Wing (PMW) has published the official annual performance appraisal results for the active cycle.",
                NextActionText: $"The Appraisee ({employeeName}) is requested to log in to the NBP PMS Portal, inspect their finalized performance rating, and submit their formal acknowledgement (Agree or Disagree with justification) before the deadline.",
                ActionOwner: $"Appraisee ({employeeName})"
            ),

            "Published->EmployeeAgreed" => (
                Subject: $"[NBP PMS 2.0] Appraisal Acknowledged & Agreed: {employeeName}",
                StageHeadline: "Appraisal Form Completed & Acknowledged",
                WhatHappened: "The employee has reviewed their final appraisal results and recorded formal agreement. The appraisal record is permanently finalized and archived in bank records.",
                NextActionText: "The appraisal cycle for this employee is fully completed. No further action is required from any party.",
                ActionOwner: "None (Process Completed)"
            ),

            "Published->EmployeeDisagreed" => (
                Subject: $"[NBP PMS 2.0] Appraisal Disagreement Registered: {employeeName}",
                StageHeadline: "Formal Disagreement Registered by Employee",
                WhatHappened: "The employee has reviewed their final rating and registered a formal disagreement along with recorded justification comments.",
                NextActionText: "The Group Performance Manager and PMW Disagreement Committee will review the recorded dispute notes and initiate review procedures as per NBP HR Policy.",
                ActionOwner: "Group Performance Manager & PMW HR"
            ),

            _ => (
                Subject: $"[NBP PMS 2.0] Appraisal Stage Update: {employeeName} — {newStatus}",
                StageHeadline: $"Appraisal Status Updated to {newStatus}",
                WhatHappened: $"The performance appraisal for {employeeName} has progressed from {previousStatus} to {newStatus}.",
                NextActionText: "Please log in to the NBP Performance Management System to review the latest appraisal updates and take any required workflow action.",
                ActionOwner: "Designated Workflow Officer"
            )
        };
    }

    private static string BuildRichNotificationHtml(
        string recipientName,
        string stageHeadline,
        string whatHappened,
        string nextActionText,
        string actionOwner,
        string employeeName,
        string employeeSapId,
        string employeeGrade,
        string employeeDesignation,
        string employeeBranch,
        string employeeGroup,
        string cycleTitle,
        string firstAppraiserName,
        string firstAppraiserSap,
        string secondAppraiserName,
        string secondAppraiserSap,
        string? coAppraiserName,
        string? coAppraiserSap
    )
    {
        var coAppraiserHtml = (!string.IsNullOrWhiteSpace(coAppraiserName))
            ? $@"<tr style='border-bottom: 1px solid #f1f5f9;'>
                   <td style='padding: 10px 16px; color: #64748b; font-weight: 600;'>Co-Appraiser:</td>
                   <td style='padding: 10px 16px; font-weight: 600;'>{coAppraiserName} <span style='color: #64748b; font-weight: normal;'>(SAP: {coAppraiserSap})</span></td>
                 </tr>"
            : "";

        return $@"
        <table style='width: 100%; max-width: 650px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);'>
          <tr>
            <td style='background: linear-gradient(135deg, #005a2c 0%, #007a3d 100%); padding: 24px 30px; text-align: left; color: #ffffff;'>
              <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                  <td>
                    <div style='font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;'>NATIONAL BANK OF PAKISTAN</div>
                    <div style='font-size: 12px; font-weight: 600; color: #a7f3d0; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;'>Performance Management System (PMS 2.0)</div>
                  </td>
                  <td style='text-align: right;'>
                    <span style='background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #ffffff; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 20px; text-transform: uppercase;'>
                      Workflow Alert
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style='padding: 28px 30px; background-color: #ffffff;'>
              <div style='font-size: 15px; color: #0f172a; margin-bottom: 16px;'>
                Dear <strong>{recipientName}</strong>,
              </div>

              <!-- Stage Status Banner -->
              <div style='background-color: #ecfdf5; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 6px; margin-bottom: 22px;'>
                <div style='font-size: 14px; font-weight: 700; color: #065f46;'>
                  🔔 {stageHeadline}
                </div>
                <div style='font-size: 13px; color: #047857; margin-top: 4px; line-height: 1.5;'>
                  {whatHappened}
                </div>
              </div>

              <!-- Appraisee Information Card -->
              <div style='border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; overflow: hidden;'>
                <div style='background-color: #f1f5f9; padding: 10px 16px; font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;'>
                  👤 Appraisee (Employee) Information
                </div>
                <table style='width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;'>
                  <tr style='border-bottom: 1px solid #f1f5f9;'>
                    <td style='padding: 10px 16px; width: 35%; color: #64748b; font-weight: 600;'>Employee Name:</td>
                    <td style='padding: 10px 16px; font-weight: 700; color: #0f172a;'>{employeeName}</td>
                  </tr>
                  <tr style='border-bottom: 1px solid #f1f5f9;'>
                    <td style='padding: 10px 16px; color: #64748b; font-weight: 600;'>SAP ID / Grade:</td>
                    <td style='padding: 10px 16px;'><strong>{employeeSapId}</strong> &bull; Grade {employeeGrade}</td>
                  </tr>
                  <tr style='border-bottom: 1px solid #f1f5f9;'>
                    <td style='padding: 10px 16px; color: #64748b; font-weight: 600;'>Designation:</td>
                    <td style='padding: 10px 16px;'>{employeeDesignation}</td>
                  </tr>
                  <tr style='border-bottom: 1px solid #f1f5f9;'>
                    <td style='padding: 10px 16px; color: #64748b; font-weight: 600;'>Branch / Department:</td>
                    <td style='padding: 10px 16px;'>{employeeBranch} ({employeeGroup})</td>
                  </tr>
                  <tr>
                    <td style='padding: 10px 16px; color: #64748b; font-weight: 600;'>Appraisal Cycle:</td>
                    <td style='padding: 10px 16px; font-weight: 600; color: #0369a1;'>{cycleTitle}</td>
                  </tr>
                </table>
              </div>

              <!-- Appraiser Line Card -->
              <div style='border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; overflow: hidden;'>
                <div style='background-color: #f1f5f9; padding: 10px 16px; font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;'>
                  👥 Designated Evaluation Hierarchy
                </div>
                <table style='width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;'>
                  <tr style='border-bottom: 1px solid #f1f5f9;'>
                    <td style='padding: 10px 16px; width: 35%; color: #64748b; font-weight: 600;'>1st Appraiser:</td>
                    <td style='padding: 10px 16px; font-weight: 600;'>{firstAppraiserName} <span style='color: #64748b; font-weight: normal;'>(SAP: {firstAppraiserSap})</span></td>
                  </tr>
                  <tr style='border-bottom: 1px solid #f1f5f9;'>
                    <td style='padding: 10px 16px; color: #64748b; font-weight: 600;'>2nd Appraiser / Supervisor:</td>
                    <td style='padding: 10px 16px; font-weight: 600;'>{secondAppraiserName} <span style='color: #64748b; font-weight: normal;'>(SAP: {secondAppraiserSap})</span></td>
                  </tr>
                  {coAppraiserHtml}
                </table>
              </div>

              <!-- Next Steps & Action Card -->
              <div style='background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; border-radius: 8px; padding: 16px 18px; margin-bottom: 24px;'>
                <div style='font-size: 13px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;'>
                  👉 What Happens Next & Required Action
                </div>
                <div style='font-size: 13px; color: #1e3a8a; margin-top: 6px; line-height: 1.6;'>
                  {nextActionText}
                </div>
                <div style='font-size: 12px; color: #1d4ed8; font-weight: 700; margin-top: 10px;'>
                  📌 Action Owner: <span style='color: #1e40af; background: #dbeafe; padding: 3px 8px; border-radius: 4px;'>{actionOwner}</span>
                </div>
              </div>

              <!-- Action Button -->
              <div style='text-align: center; margin: 28px 0 16px 0;'>
                <a href='http://localhost:5173' style='background-color: #006633; color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.15);'>
                  Log In to NBP Appraisal Portal
                </a>
              </div>
              <div style='text-align: center; font-size: 11px; color: #64748b;'>
                Portal link: <span style='color: #006633; text-decoration: underline;'>http://localhost:5173</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style='background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;'>
              <div style='font-weight: 700; color: #334155; margin-bottom: 4px;'>National Bank of Pakistan — Human Resources Management Group (HRMG)</div>
              <div>Performance Management & Appraisal System &bull; Confidential Official Communication</div>
              <div style='margin-top: 8px; color: #94a3b8; font-size: 10px;'>This is an automated system notification. Please do not reply directly to this email. For technical assistance or workflow queries, contact HR Support at hr-support@nbp.com.pk.</div>
            </td>
          </tr>
        </table>";
    }
}
