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

        // 5. Submit Self Assessment to First Appraiser Assessment
        if (from == WorkflowStatus.AnnualReviewSelfAssessment && to == WorkflowStatus.FirstAppraiserAssessment)
        {
            return true;
        }

        // 6. First Appraiser to Second Appraiser
        if (from == WorkflowStatus.FirstAppraiserAssessment && to == WorkflowStatus.SecondAppraiserReview)
        {
            if (role != "FirstAppraiser" && role != "PmwAdmin" && role != "PmwSuperAdmin")
            {
                errorMessage = "Only First Appraiser can forward assessment to Second Appraiser.";
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
}
