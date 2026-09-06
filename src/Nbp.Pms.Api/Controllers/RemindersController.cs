using System.Text;
using Nbp.Pms.Contracts.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Application.Interfaces;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class RemindersController : ControllerBase
{
    private readonly PmsDbContext _db;
    private readonly IEmailSender _emailSender;

    public RemindersController(PmsDbContext db, IEmailSender emailSender)
    {
        _db = db;
        _emailSender = emailSender;
    }

    [HttpGet("preview")]
    public async Task<IActionResult> PreviewRecipients([FromQuery] string? group, [FromQuery] string? grade)
    {
        var query = _db.Employees.AsQueryable();

        if (!string.IsNullOrWhiteSpace(group) && group != "All Groups")
        {
            query = query.Where(e => e.ReportingGroup == group);
        }

        if (!string.IsNullOrWhiteSpace(grade) && grade != "All Grades")
        {
            query = query.Where(e => e.Grade == grade);
        }

        var recipients = await query.Select(e => new
        {
            e.SapId,
            e.FullName,
            e.Grade,
            e.ReportingGroup,
            CurrentStatus = "Objective Draft"
        }).ToListAsync();

        return Ok(recipients);
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendReminders([FromBody] ReminderDispatchDto dto)
    {
        var query = _db.Employees.AsQueryable();

        if (!string.IsNullOrWhiteSpace(dto.Group) && dto.Group != "All Groups")
        {
            query = query.Where(e => e.ReportingGroup == dto.Group);
        }

        var employees = await query.ToListAsync();
        foreach (var emp in employees)
        {
            await _emailSender.SendEmailAsync(emp.Email ?? $"{emp.SapId}@nbp.com.pk", emp.FullName, dto.Subject, dto.MessageBody);
        }

        var audit = new AuditEvent
        {
            EventType = "BULK_REMINDERS_DISPATCHED",
            ActorUserId = dto.ActorUserId,
            ActorRole = "PmwAdmin",
            ActionDescription = $"Dispatched bulk reminder emails to {employees.Count} recipients (Filter Group: {dto.Group}, Grade: {dto.Grade}).",
            Timestamp = DateTime.UtcNow
        };

        _db.AuditEvents.Add(audit);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Successfully dispatched {employees.Count} reminder emails.", count = employees.Count });
    }

    /// <summary>
    /// Send targeted email nudge directly to a supervisor with a formatted mini dashboard of their team's appraisal workflow statuses.
    /// </summary>
    [HttpPost("nudge-supervisor")]
    public async Task<IActionResult> NudgeSupervisor([FromBody] NudgeSupervisorDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.SupervisorSapId))
            return BadRequest(new { message = "Supervisor SAP ID is required." });

        var supervisor = await _db.Employees
            .FirstOrDefaultAsync(e => e.SapId == dto.SupervisorSapId);

        string recipientEmail = !string.IsNullOrWhiteSpace(dto.SupervisorEmail) 
            ? dto.SupervisorEmail.Trim() 
            : (supervisor?.Email ?? $"{dto.SupervisorSapId}@nbp.com.pk");

        string recipientName = !string.IsNullOrWhiteSpace(dto.SupervisorName)
            ? dto.SupervisorName.Trim()
            : (supervisor?.FullName ?? $"Supervisor {dto.SupervisorSapId}");

        // Fetch team employee cycles for this supervisor to construct the mini dashboard
        var teamCycles = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Include(ec => ec.Cycle)
            .Include(ec => ec.FirstAppraiser)
            .Include(ec => ec.SecondAppraiser)
            .Include(ec => ec.CoAppraiser)
            .Where(ec => 
                (ec.FirstAppraiser != null && ec.FirstAppraiser.SapId == dto.SupervisorSapId) ||
                ec.PendingFirstAppraiserSapId == dto.SupervisorSapId ||
                (ec.SecondAppraiser != null && ec.SecondAppraiser.SapId == dto.SupervisorSapId) ||
                ec.PendingSecondAppraiserSapId == dto.SupervisorSapId)
            .OrderBy(ec => ec.CurrentStatus)
            .ThenBy(ec => ec.Employee != null ? ec.Employee.FullName : "")
            .ToListAsync();

        int pendingTargetApproval = teamCycles.Count(c => c.CurrentStatus == WorkflowStatus.ObjectiveSubmitted);
        int pendingEvaluation = teamCycles.Count(c => c.CurrentStatus == WorkflowStatus.FirstAppraiserAssessment);
        int pendingCountersign = teamCycles.Count(c => c.CurrentStatus == WorkflowStatus.SecondAppraiserReview);
        int totalPending = pendingTargetApproval + pendingEvaluation + pendingCountersign;

        string subject = !string.IsNullOrWhiteSpace(dto.Subject)
            ? dto.Subject
            : $"Urgent: NBP Performance Appraisal Action Required - Pending Team Reviews ({totalPending} Pending)";

        // Build rich formatted mini dashboard HTML email (or use full HTML body if supplied)
        string body;
        if (!string.IsNullOrWhiteSpace(dto.MessageBody) && (dto.MessageBody.Contains("<table") || dto.MessageBody.Contains("<!DOCTYPE")))
        {
            body = dto.MessageBody;
        }
        else
        {
            body = BuildSupervisorDashboardHtml(recipientName, dto.SupervisorSapId, teamCycles, dto.MessageBody ?? dto.CustomNote, dto.GroupCode, dto.PortalUrl);
        }

        await _emailSender.SendEmailAsync(recipientEmail, recipientName, subject, body);

        var audit = new AuditEvent
        {
            EventType = "SUPERVISOR_GPM_NUDGE_SENT",
            ActorUserId = dto.ActorUserId ?? "GPM",
            ActorRole = "GroupPerformanceManager",
            TargetEntityType = "Supervisor",
            TargetEntityId = dto.SupervisorSapId,
            ActionDescription = $"Dispatched urgent email nudge with formatted team appraisal digest to Supervisor {recipientName} ({dto.SupervisorSapId}) at {recipientEmail} ({totalPending} pending items).",
            Timestamp = DateTime.UtcNow
        };

        _db.AuditEvents.Add(audit);
        await _db.SaveChangesAsync();

        return Ok(new { 
            success = true, 
            message = $"Email reminder with team digest dispatched successfully to Supervisor {recipientName} ({recipientEmail}).",
            recipientEmail,
            recipientName,
            totalTeam = teamCycles.Count,
            pendingEvaluations = pendingEvaluation,
            pendingTargetApprovals = pendingTargetApproval,
            pendingCountersigns = pendingCountersign
        });
    }

    /// <summary>
    /// Bulk email nudge to multiple supervisors who have pending appraisals in GPM jurisdiction with personalized mini dashboards.
    /// </summary>
    [HttpPost("nudge-supervisors-bulk")]
    public async Task<IActionResult> NudgeSupervisorsBulk([FromBody] BulkNudgeSupervisorsDto dto)
    {
        if (dto.SupervisorSapIds == null || dto.SupervisorSapIds.Count == 0)
            return BadRequest(new { message = "At least one supervisor SAP ID is required." });

        var supervisors = await _db.Employees
            .Where(e => dto.SupervisorSapIds.Contains(e.SapId))
            .ToListAsync();

        var supervisorMap = supervisors.ToDictionary(s => s.SapId, s => s);

        // Fetch all relevant employee cycles in batch for the requested supervisors
        var allCycles = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Include(ec => ec.Cycle)
            .Include(ec => ec.FirstAppraiser)
            .Include(ec => ec.SecondAppraiser)
            .Include(ec => ec.CoAppraiser)
            .Where(ec => 
                (ec.FirstAppraiser != null && dto.SupervisorSapIds.Contains(ec.FirstAppraiser.SapId)) ||
                (ec.PendingFirstAppraiserSapId != null && dto.SupervisorSapIds.Contains(ec.PendingFirstAppraiserSapId)) ||
                (ec.SecondAppraiser != null && dto.SupervisorSapIds.Contains(ec.SecondAppraiser.SapId)) ||
                (ec.PendingSecondAppraiserSapId != null && dto.SupervisorSapIds.Contains(ec.PendingSecondAppraiserSapId)))
            .ToListAsync();

        int dispatchedCount = 0;

        foreach (var sapId in dto.SupervisorSapIds)
        {
            supervisorMap.TryGetValue(sapId, out var sup);
            string recipientEmail = sup?.Email ?? $"{sapId}@nbp.com.pk";
            string recipientName = sup?.FullName ?? $"Supervisor {sapId}";

            var supCycles = allCycles.Where(ec => 
                (ec.FirstAppraiser != null && ec.FirstAppraiser.SapId == sapId) ||
                ec.PendingFirstAppraiserSapId == sapId ||
                (ec.SecondAppraiser != null && ec.SecondAppraiser.SapId == sapId) ||
                ec.PendingSecondAppraiserSapId == sapId).ToList();

            int pendingCount = supCycles.Count(c => 
                c.CurrentStatus == WorkflowStatus.ObjectiveSubmitted ||
                c.CurrentStatus == WorkflowStatus.FirstAppraiserAssessment ||
                c.CurrentStatus == WorkflowStatus.SecondAppraiserReview);

            string subject = !string.IsNullOrWhiteSpace(dto.Subject)
                ? dto.Subject.Replace("{SupervisorName}", recipientName)
                : $"Urgent: NBP Performance Appraisal Action Required - Pending Team Reviews ({pendingCount} Pending)";

            string body = BuildSupervisorDashboardHtml(recipientName, sapId, supCycles, dto.MessageBody ?? dto.CustomNote, dto.GroupCode, dto.PortalUrl);

            await _emailSender.SendEmailAsync(recipientEmail, recipientName, subject, body);
            dispatchedCount++;
        }

        var audit = new AuditEvent
        {
            EventType = "SUPERVISOR_GPM_BULK_NUDGE_SENT",
            ActorUserId = dto.ActorUserId ?? "GPM",
            ActorRole = "GroupPerformanceManager",
            TargetEntityType = "ReportingGroup",
            TargetEntityId = dto.GroupCode ?? "ALL",
            ActionDescription = $"Dispatched formatted appraisal digest email reminders to {dispatchedCount} supervisor(s) in Group {dto.GroupCode ?? "All"}.",
            Timestamp = DateTime.UtcNow
        };

        _db.AuditEvents.Add(audit);
        await _db.SaveChangesAsync();

        return Ok(new { 
            success = true, 
            message = $"Dispatched formatted digest reminders to {dispatchedCount} supervisor(s).",
            count = dispatchedCount 
        });
    }

    /// <summary>
    /// Construct an executive, highly-styled HTML mini dashboard email for supervisors.
    /// </summary>
    private static string BuildSupervisorDashboardHtml(
        string supervisorName, 
        string supervisorSapId, 
        List<EmployeeCycle> teamCycles, 
        string? customNote = null, 
        string? groupCode = null,
        string? portalUrl = null)
    {
        int total = teamCycles.Count;
        int pendingTargets = teamCycles.Count(c => c.CurrentStatus == WorkflowStatus.ObjectiveSubmitted);
        int pendingEvaluations = teamCycles.Count(c => c.CurrentStatus == WorkflowStatus.FirstAppraiserAssessment);
        int pendingCountersigns = teamCycles.Count(c => c.CurrentStatus == WorkflowStatus.SecondAppraiserReview);
        int completed = teamCycles.Count(c => c.CurrentStatus == WorkflowStatus.EmployeeAgreed || c.CurrentStatus == WorkflowStatus.AdministrativelyCompleted);
        int selfAssessPending = teamCycles.Count(c => c.CurrentStatus == WorkflowStatus.AnnualReviewSelfAssessment || c.CurrentStatus == WorkflowStatus.ObjectiveDraft);

        string url = !string.IsNullOrWhiteSpace(portalUrl) ? portalUrl : "http://localhost:5173/";

        var sb = new StringBuilder();
        sb.Append(@"<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'/>
<meta name='viewport' content='width=device-width, initial-scale=1.0'/>
<title>NBP Performance Appraisal Action Required</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #1e293b; }
.wrapper { max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
.header { background-color: #0f2347; color: #ffffff; padding: 28px 24px; text-align: left; border-bottom: 4px solid #f59e0b; }
.header-tag { display: inline-block; background-color: #1e3a8a; color: #bfdbfe; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #3b82f6; }
.header h1 { margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.3px; color: #ffffff !important; }
.header p { margin: 6px 0 0 0; font-size: 12px; opacity: 0.95; color: #cbd5e1 !important; font-weight: 500; }
.content { padding: 24px; }
.greeting { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
.note-box { background-color: #f8fafc; border-left: 4px solid #1e3a8a; padding: 14px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.6; color: #334155; }
.section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 24px 0 10px 0; }
.metrics-table { width: 100%; border-collapse: separate; border-spacing: 6px; margin: 12px 0 20px 0; table-layout: fixed; }
.metric-tile { padding: 12px 8px; text-align: center; border-radius: 8px; border: 1px solid #e2e8f0; }
.metric-num { font-size: 22px; font-weight: 900; line-height: 1.1; }
.metric-lbl { font-size: 9px; font-weight: 800; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.3px; }
.table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0 24px 0; }
table.data-table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; }
table.data-table th { background-color: #f8fafc; color: #475569; font-weight: 800; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; padding: 10px 10px; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
table.data-table td { padding: 10px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
table.data-table tr:last-child td { border-bottom: none; }
.badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; white-space: nowrap; }
.badge-eval { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.badge-target { background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
.badge-counter { background-color: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
.badge-done { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
.badge-draft { background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.cta-area { text-align: center; margin: 28px 0 16px 0; }
.btn-cta { background-color: #0f2347; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 13px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.12); border: 1px solid #1e3a8a; }
.footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; font-size: 11px; color: #64748b; line-height: 1.5; }
</style>
</head>
<body>
<div class='wrapper' style='max-width: 760px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;'>
  <!-- Distinct Executive Midnight Navy Header with Gold Trim & High Contrast White Text -->
  <table width='100%' cellpadding='0' cellspacing='0' border='0' style='width: 100%; border-collapse: collapse; margin: 0; padding: 0;'>
    <tr>
      <td class='header' bgcolor='#0f2347' style='background-color: #0f2347; background: #0f2347 linear-gradient(135deg, #09172e 0%, #1e3a8a 100%); color: #ffffff !important; padding: 28px 24px; text-align: left; border-bottom: 4px solid #f59e0b;'>
        <div class='header-tag' style='display: inline-block; background-color: #1e3a8a; color: #bfdbfe !important; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #3b82f6;'>
          National Bank of Pakistan • PMS 2.0
        </div>
        <h1 style='margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.3px; color: #ffffff !important; line-height: 1.3;'>
          Direct Line Supervisor Appraisal Review Digest
        </h1>
        <p style='margin: 6px 0 0 0; font-size: 12px; color: #cbd5e1 !important; font-weight: 500;'>
          Group Performance Management • HR Business Partner Operations
        </p>
      </td>
    </tr>
  </table>
  <div class='content'>
    <div class='greeting'>Dear Supervisor " + supervisorName + @" (SAP: " + supervisorSapId + @"),</div>
    <p style='font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;'>
      As the designated line supervisor / appraiser, your timely review and scoring are urgently required to calibrate team performance and facilitate Group Bell Curve distribution. Please find your team's live workflow digest below.
    </p>");

        if (!string.IsNullOrWhiteSpace(customNote))
        {
            sb.Append("<div class='note-box' style='background-color: #f8fafc; border-left: 4px solid #1e3a8a; padding: 14px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.6; color: #334155;'><strong>Message from HR Business Partner:</strong><br/>" + customNote + "</div>");
        }

        // 5-tile mini dashboard table
        sb.Append(@"<div class='section-title'>Team Workflow Status Mini Dashboard</div>
    <table class='metrics-table'>
      <tr>
        <td class='metric-tile' style='background-color: #f8fafc;'>
          <div class='metric-num' style='color: #0f172a;'>" + total + @"</div>
          <div class='metric-lbl' style='color: #64748b;'>Assigned Team</div>
        </td>
        <td class='metric-tile' style='background-color: #fffbeb; border-color: #fef3c7;'>
          <div class='metric-num' style='color: #b45309;'>" + pendingEvaluations + @"</div>
          <div class='metric-lbl' style='color: #92400e;'>Scoring Due</div>
        </td>
        <td class='metric-tile' style='background-color: #eff6ff; border-color: #dbeafe;'>
          <div class='metric-num' style='color: #1d4ed8;'>" + pendingTargets + @"</div>
          <div class='metric-lbl' style='color: #1e40af;'>Targets Due</div>
        </td>
        <td class='metric-tile' style='background-color: #f5f3ff; border-color: #ede9fe;'>
          <div class='metric-num' style='color: #7c3aed;'>" + pendingCountersigns + @"</div>
          <div class='metric-lbl' style='color: #6b21a8;'>Countersigns</div>
        </td>
        <td class='metric-tile' style='background-color: #ecfdf5; border-color: #d1fae5;'>
          <div class='metric-num' style='color: #047857;'>" + completed + @"</div>
          <div class='metric-lbl' style='color: #065f46;'>Completed</div>
        </td>
      </tr>
    </table>");

        // Table of appraisees
        sb.Append(@"<div class='section-title'>Direct Appraisees & Supervisory Review Hierarchy</div>
    <div class='table-wrap'>
      <table class='data-table'>
        <thead>
          <tr>
            <th>Appraisee Name &amp; SAP</th>
            <th>Grade / Designation</th>
            <th>Workflow Stage</th>
            <th>1st Appraiser</th>
            <th>Co-Appraiser</th>
            <th>2nd Appraiser / Final</th>
          </tr>
        </thead>
        <tbody>");

        if (teamCycles.Count == 0)
        {
            sb.Append("<tr><td colspan='6' style='text-align: center; color: #94a3b8; padding: 18px;'>No direct reports enrolled in the active cycle.</td></tr>");
        }
        else
        {
            foreach (var c in teamCycles)
            {
                string badgeClass = c.CurrentStatus switch
                {
                    WorkflowStatus.FirstAppraiserAssessment => "badge-eval",
                    WorkflowStatus.ObjectiveSubmitted => "badge-target",
                    WorkflowStatus.SecondAppraiserReview => "badge-counter",
                    WorkflowStatus.EmployeeAgreed or WorkflowStatus.AdministrativelyCompleted => "badge-done",
                    _ => "badge-draft"
                };

                string badgeStyle = c.CurrentStatus switch
                {
                    WorkflowStatus.FirstAppraiserAssessment => "background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;",
                    WorkflowStatus.ObjectiveSubmitted => "background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;",
                    WorkflowStatus.SecondAppraiserReview => "background-color: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff;",
                    WorkflowStatus.EmployeeAgreed or WorkflowStatus.AdministrativelyCompleted => "background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;",
                    _ => "background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;"
                };

                string statusLabel = c.CurrentStatus switch
                {
                    WorkflowStatus.FirstAppraiserAssessment => "Line Scoring Pending",
                    WorkflowStatus.ObjectiveSubmitted => "Target Approval Pending",
                    WorkflowStatus.SecondAppraiserReview => "Countersign Pending",
                    WorkflowStatus.EmployeeAgreed => "Agreed &amp; Signed",
                    WorkflowStatus.EmployeeDisagreed => "Disagreement Logged",
                    WorkflowStatus.AdministrativelyCompleted => "Admin Completed",
                    WorkflowStatus.ObjectiveApproved => "Targets Approved",
                    WorkflowStatus.AnnualReviewSelfAssessment => "Self-Assessment Due",
                    WorkflowStatus.CoAppraiserReview => "Co-Appraiser Review",
                    WorkflowStatus.Published => "Published (Awaiting Ack)",
                    _ => c.CurrentStatus.ToString()
                };

                string empName = c.Employee?.FullName ?? "Unknown";
                string empSap = c.Employee?.SapId ?? "";
                string gradeDesig = (c.SnapshotGrade ?? c.Employee?.Grade ?? "") + " • " + (c.SnapshotDesignation ?? c.Employee?.Designation ?? "");
                string firstApp = c.FirstAppraiser?.FullName ?? c.PendingFirstAppraiserSapId ?? "-";
                string coApp = c.CoAppraiser?.FullName ?? c.PendingCoAppraiserSapId ?? "-";
                string secondApp = c.SecondAppraiser?.FullName ?? c.PendingSecondAppraiserSapId ?? "-";

                sb.Append("<tr>");
                sb.Append("<td><strong>" + empName + "</strong><br/><span style='color: #64748b; font-family: monospace; font-size: 10px;'>SAP: " + empSap + "</span></td>");
                sb.Append("<td style='color: #475569;'>" + gradeDesig + "</td>");
                sb.Append("<td><span class='badge " + badgeClass + "' style='display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; white-space: nowrap; " + badgeStyle + "'>" + statusLabel + "</span></td>");
                sb.Append("<td style='color: #334155;'>" + firstApp + "</td>");
                sb.Append("<td style='color: #64748b;'>" + coApp + "</td>");
                sb.Append("<td style='color: #334155;'>" + secondApp + "</td>");
                sb.Append("</tr>");
            }
        }

        sb.Append(@"</tbody>
      </table>
    </div>");

        // Action CTA Button
        sb.Append(@"<div class='cta-area'>
      <a href='" + url + @"' class='btn-cta' style='background-color: #0f2347; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 13px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.12); border: 1px solid #1e3a8a;'>Access PMS 2.0 Portal to Complete Reviews &rarr;</a>
    </div>");

        // Footer
        sb.Append(@"<div class='footer'>
      <p style='margin: 0 0 6px 0;'><strong>Dispatched by:</strong> Group Performance Management (HR Business Partner Operations) • National Bank of Pakistan</p>
      <p style='margin: 0;'>Notice: This email contains privileged performance evaluation data. Assessments and commentary are strictly confidential and subject to bank HR compliance audits.</p>
    </div>
  </div>
</div>
</body>
</html>");

        return sb.ToString();
    }
}

public record ReminderDispatchDto(string Group, string Grade, string Subject, string MessageBody, string ActorUserId);

public record NudgeSupervisorDto(
    string SupervisorSapId, 
    string? SupervisorEmail, 
    string? SupervisorName, 
    string? Subject, 
    string? MessageBody, 
    string? CustomNote = null,
    string? ActorUserId = "GPM", 
    string? GroupCode = null,
    string? PortalUrl = null
);

public record BulkNudgeSupervisorsDto(
    List<string> SupervisorSapIds, 
    string? Subject, 
    string? MessageBody, 
    string? CustomNote = null,
    string? ActorUserId = "GPM", 
    string? GroupCode = null,
    string? PortalUrl = null
);
