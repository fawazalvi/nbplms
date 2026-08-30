using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AdminController : ControllerBase
{
    private readonly PmsDbContext _db;
    private readonly DbSeederService _seeder;
    private readonly Nbp.Pms.Application.Services.WorkflowEngine _workflowEngine;

    public AdminController(PmsDbContext db, DbSeederService seeder, Nbp.Pms.Application.Services.WorkflowEngine workflowEngine)
    {
        _db = db;
        _seeder = seeder;
        _workflowEngine = workflowEngine;
    }

    /// <summary>
    /// Gets live record counts across all database tables.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetDatabaseStatus()
    {
        var status = new
        {
            reportingGroupsCount = await _db.ReportingGroups.CountAsync(),
            gradeMappingsCount = await _db.GradeMappings.CountAsync(),
            employeesCount = await _db.Employees.CountAsync(),
            cyclesCount = await _db.AppraisalCycles.CountAsync(),
            employeeCyclesCount = await _db.EmployeeCycles.CountAsync(),
            cycleReportingGroupsCount = await _db.CycleReportingGroups.CountAsync(),
            cycleGradeMappingsCount = await _db.CycleGradeMappings.CountAsync(),
            formTemplatesCount = await _db.FormTemplates.CountAsync(),
            objectivesCount = await _db.Objectives.CountAsync(),
            traitsCount = await _db.BehaviourTraits.CountAsync(),
            scoresCount = await _db.Scores.CountAsync(),
            developmentReviewsCount = await _db.DevelopmentReviews.CountAsync(),
            disagreementCasesCount = await _db.DisagreementCases.CountAsync(),
            bellCurvePoliciesCount = await _db.BellCurvePolicies.CountAsync(),
            systemUsersCount = await _db.SystemUsers.CountAsync(),
            auditEventsCount = await _db.AuditEvents.CountAsync(),
            appraisalFormAuditLogsCount = await _db.AppraisalFormAuditLogs.CountAsync(),
            emailConfigurationsCount = await _db.EmailConfigurations.CountAsync(),
            keyVersionsCount = await _db.KeyVersions.CountAsync(),
            timestamp = DateTime.UtcNow
        };

        return Ok(status);
    }

    /// <summary>
    /// Wipes all database tables cleanly. Restricted exclusively to PMW Super Admin.
    /// </summary>
    [HttpPost("clean")]
    public async Task<IActionResult> CleanDatabase([FromQuery] string? role = null, [FromHeader(Name = "X-User-Role")] string? headerRole = null)
    {
        var effectiveRole = headerRole ?? role;
        if (!string.Equals(effectiveRole, "PmwSuperAdmin", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "Access Denied. Database tools are restricted exclusively to PMW Super Admin." });
        }

        await _seeder.CleanDatabaseAsync();
        return Ok(new { message = "Database cleaned successfully. All tables reset.", timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Wipes and populates realistic NBP sample data into Microsoft SQL Server. Restricted exclusively to PMW Super Admin.
    /// </summary>
    [HttpPost("seed")]
    public async Task<IActionResult> SeedDatabase([FromQuery] string? role = null, [FromHeader(Name = "X-User-Role")] string? headerRole = null)
    {
        var effectiveRole = headerRole ?? role;
        if (!string.Equals(effectiveRole, "PmwSuperAdmin", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "Access Denied. Database tools are restricted exclusively to PMW Super Admin." });
        }

        await _seeder.CleanDatabaseAsync();
        await _seeder.SeedDatabaseAsync();

        var counts = new
        {
            reportingGroups = await _db.ReportingGroups.CountAsync(),
            gradeMappings = await _db.GradeMappings.CountAsync(),
            employees = await _db.Employees.CountAsync(),
            systemUsers = await _db.SystemUsers.CountAsync(),
            cycles = await _db.AppraisalCycles.CountAsync(),
            objectives = await _db.Objectives.CountAsync(),
            scores = await _db.Scores.CountAsync(),
            disagreements = await _db.DisagreementCases.CountAsync(),
            auditEvents = await _db.AuditEvents.CountAsync()
        };

        return Ok(new
        {
            message = "Sample NBP enterprise data successfully populated into database.",
            recordCounts = counts,
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Seeds an individual entity table with standard NBP defaults. Restricted to PMW Super Admin.
    /// </summary>
    [HttpPost("entities/{entityKey}/seed")]
    public async Task<IActionResult> SeedIndividualEntity(string entityKey, [FromQuery] string? role = null, [FromHeader(Name = "X-User-Role")] string? headerRole = null)
    {
        var effectiveRole = headerRole ?? role;
        if (!string.Equals(effectiveRole, "PmwSuperAdmin", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "Access Denied. Database tools are restricted exclusively to PMW Super Admin." });
        }

        int affected = 0;
        string entityName = entityKey.ToLowerInvariant();

        switch (entityName)
        {
            case "groups":
            case "reportinggroups":
                affected = await _seeder.SeedReportingGroupsAsync();
                break;
            case "grades":
            case "grademappings":
                affected = await _seeder.SeedGradeMappingsAsync();
                break;
            case "employees":
                affected = await _seeder.SeedEmployeesAsync();
                break;
            case "cycles":
            case "appraisalcycles":
                affected = await _seeder.SeedAppraisalCyclesAsync();
                break;
            case "forms":
            case "formtemplates":
                affected = await _seeder.SeedFormTemplatesAsync();
                break;
            case "users":
            case "systemusers":
                affected = await _seeder.SeedSystemUsersAsync();
                break;
            case "email":
            case "emailconfig":
                affected = await _seeder.SeedEmailConfigAsync();
                break;
            case "bellcurve":
            case "bellcurvepolicies":
                affected = await _seeder.SeedBellCurvePoliciesAsync();
                break;
            default:
                return BadRequest(new { message = $"Unknown entity key: '{entityKey}'. Supported: groups, grades, employees, cycles, forms, users, email, bellcurve." });
        }

        return Ok(new { message = $"Successfully seeded entity '{entityKey}'. {affected} records created/updated.", affectedCount = affected, timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Cleans an individual entity table cleanly. Restricted to PMW Super Admin.
    /// </summary>
    [HttpPost("entities/{entityKey}/clean")]
    public async Task<IActionResult> CleanIndividualEntity(string entityKey, [FromQuery] string? role = null, [FromHeader(Name = "X-User-Role")] string? headerRole = null)
    {
        var effectiveRole = headerRole ?? role;
        if (!string.Equals(effectiveRole, "PmwSuperAdmin", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "Access Denied. Database tools are restricted exclusively to PMW Super Admin." });
        }

        int affected = 0;
        string entityName = entityKey.ToLowerInvariant();

        switch (entityName)
        {
            case "groups":
            case "reportinggroups":
                affected = await _seeder.CleanReportingGroupsAsync();
                break;
            case "grades":
            case "grademappings":
                affected = await _seeder.CleanGradeMappingsAsync();
                break;
            case "employees":
                affected = await _seeder.CleanEmployeesAsync();
                break;
            case "cycles":
            case "appraisalcycles":
                affected = await _seeder.CleanAppraisalCyclesAsync();
                break;
            case "forms":
            case "formtemplates":
                affected = await _seeder.CleanFormTemplatesAsync();
                break;
            case "users":
            case "systemusers":
                affected = await _seeder.CleanSystemUsersAsync();
                break;
            case "audit":
            case "auditevents":
                affected = await _seeder.CleanAuditEventsAsync();
                break;
            case "email":
            case "emailconfig":
                affected = await _seeder.CleanEmailConfigAsync();
                break;
            case "bellcurve":
            case "bellcurvepolicies":
                affected = await _seeder.CleanBellCurvePoliciesAsync();
                break;
            default:
                return BadRequest(new { message = $"Unknown entity key: '{entityKey}'. Supported: groups, grades, employees, cycles, forms, users, audit, email, bellcurve." });
        }

        return Ok(new { message = $"Successfully cleaned entity '{entityKey}'. {affected} records purged.", affectedCount = affected, timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Runs schema migration and repair DDL scripts. Restricted to PMW Super Admin.
    /// </summary>
    [HttpPost("schema/migrate")]
    public async Task<IActionResult> MigrateSchema([FromQuery] string? role = null, [FromHeader(Name = "X-User-Role")] string? headerRole = null)
    {
        var effectiveRole = headerRole ?? role;
        if (!string.Equals(effectiveRole, "PmwSuperAdmin", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "Access Denied. Database tools are restricted exclusively to PMW Super Admin." });
        }

        await _seeder.MigrateDatabaseSchemaAsync();
        return Ok(new { message = "Schema migration and integrity repair executed successfully.", timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Workflow Dashboard: Returns aggregated status counts and all employee cycles for the workflow management console.
    /// </summary>
    [HttpGet("workflow-dashboard")]
    public async Task<IActionResult> GetWorkflowDashboard([FromQuery] Guid? cycleId = null)
    {
        var query = _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Include(ec => ec.Cycle)
            .Include(ec => ec.FirstAppraiser)
            .Include(ec => ec.SecondAppraiser)
            .AsQueryable();

        if (cycleId.HasValue)
        {
            query = query.Where(ec => ec.CycleId == cycleId.Value);
        }

        var allCycles = await query.ToListAsync();

        // Aggregated counts per status
        var statusCounts = allCycles
            .GroupBy(ec => ec.CurrentStatus.ToString())
            .Select(g => new { status = g.Key, count = g.Count() })
            .OrderBy(x => x.status)
            .ToList();

        // Employee cycle details
        var employeeCycles = allCycles.Select(ec => new
        {
            ec.Id,
            EmployeeName = ec.Employee?.FullName ?? "Unknown",
            SapId = ec.Employee?.SapId ?? "",
            Grade = ec.Employee?.Grade ?? "",
            Group = ec.Employee?.ReportingGroup ?? "",
            FormType = ec.AssignedFormType.ToString(),
            CurrentStatus = ec.CurrentStatus.ToString(),
            CurrentStatusCode = (int)ec.CurrentStatus,
            FirstAppraiserName = ec.FirstAppraiser?.FullName,
            FirstAppraiserSapId = ec.FirstAppraiser?.SapId ?? ec.PendingFirstAppraiserSapId,
            SecondAppraiserName = ec.SecondAppraiser?.FullName,
            SecondAppraiserSapId = ec.SecondAppraiser?.SapId ?? ec.PendingSecondAppraiserSapId,
            CycleName = ec.Cycle?.Title ?? "Unknown Cycle",
            ec.CycleId,
            ec.SubmittedAt,
            ec.ApprovedAt,
            ec.PublishedAt,
            ec.AcknowledgedAt,
            ec.UpdatedAt,
            ec.CreatedAt
        }).OrderBy(x => x.CurrentStatusCode).ThenBy(x => x.EmployeeName).ToList();

        // Available cycles for dropdown
        var cycles = await _db.AppraisalCycles
            .OrderByDescending(c => c.StartDate)
            .Select(c => new { c.Id, c.Title, c.StartDate, c.EndDate })
            .ToListAsync();

        return Ok(new { statusCounts, employeeCycles, cycles, totalCount = allCycles.Count });
    }

    /// <summary>
    /// Force-transition an EmployeeCycle to a target status (PMW Super Admin override).
    /// </summary>
    [HttpPost("force-transition/{employeeCycleId}")]
    public async Task<IActionResult> ForceTransition(
        Guid employeeCycleId,
        [FromBody] ForceTransitionDto dto)
    {
        var empCycle = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .FirstOrDefaultAsync(ec => ec.Id == employeeCycleId);

        if (empCycle == null)
            return NotFound(new { message = "Employee cycle not found." });

        if (!Enum.TryParse<Nbp.Pms.Contracts.Enums.WorkflowStatus>(dto.TargetStatus, out var targetStatus))
            return BadRequest(new { message = $"Invalid target status: {dto.TargetStatus}" });

        var previousStatus = empCycle.CurrentStatus;
        empCycle.CurrentStatus = targetStatus;
        empCycle.UpdatedAt = DateTime.UtcNow;

        // Generate audit event for administrative override
        var audit = new Nbp.Pms.Domain.Entities.AuditEvent
        {
            EventType = $"ADMIN_FORCE_TRANSITION_{previousStatus}_TO_{targetStatus}",
            ActorUserId = dto.ActorSapId,
            ActorRole = "PmwSuperAdmin",
            TargetEntityId = employeeCycleId.ToString(),
            TargetEntityType = "EmployeeCycle",
            PreStatus = previousStatus.ToString(),
            PostStatus = targetStatus.ToString(),
            ActionDescription = $"Administrative force-transition from {previousStatus} to {targetStatus}",
            JustificationComments = dto.Justification,
            Timestamp = DateTime.UtcNow
        };

        _db.AuditEvents.Add(audit);
        await _db.SaveChangesAsync();

        // Dispatch notifications if configured (MUST be awaited so DbContext isn't disposed)
        await _workflowEngine.DispatchNotificationsAsync(empCycle, previousStatus, targetStatus);

        return Ok(new
        {
            message = $"Successfully transitioned {empCycle.Employee?.FullName ?? "employee"} from {previousStatus} to {targetStatus}.",
            previousStatus = previousStatus.ToString(),
            newStatus = targetStatus.ToString(),
            auditId = audit.Id
        });
    }

    /// <summary>
    /// Get audit events filtered for workflow transitions.
    /// </summary>
    [HttpGet("workflow-audit")]
    public async Task<IActionResult> GetWorkflowAudit([FromQuery] string? statusFilter = null, [FromQuery] int limit = 200)
    {
        var query = _db.AuditEvents
            .Where(a => a.EventType.Contains("WORKFLOW_TRANSITION") || a.EventType.Contains("ADMIN_FORCE_TRANSITION"))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            query = query.Where(a => (a.PreStatus != null && a.PreStatus.Contains(statusFilter)) || (a.PostStatus != null && a.PostStatus.Contains(statusFilter)));
        }

        var events = await query
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToListAsync();

        return Ok(events);
    }

    /// <summary>
    /// Development/Testing helper to wipe appraisal progress and reset workflow state.
    /// </summary>
    [HttpPost("reset-appraisals")]
    public async Task<IActionResult> ResetAppraisals([FromQuery] bool clearObjectives = false)
    {
        // 1. Wipe audit logs and scores
        _db.Scores.RemoveRange(_db.Scores);
        _db.AppraisalFormAuditLogs.RemoveRange(_db.AppraisalFormAuditLogs);
        _db.AuditEvents.RemoveRange(_db.AuditEvents);

        // 2. Optionally wipe objectives
        if (clearObjectives)
        {
            _db.Objectives.RemoveRange(_db.Objectives);
        }

        // 3. Reset workflow status
        var cycles = await _db.EmployeeCycles.ToListAsync();
        foreach (var c in cycles)
        {
            c.CurrentStatus = clearObjectives ? WorkflowStatus.ObjectiveDraft : WorkflowStatus.FirstAppraiserAssessment;
            c.AppraiserValidationStatus = "Validated";
        }

        await _db.SaveChangesAsync();

        return Ok(new { 
            message = $"Appraisals reset successfully. Status set to {(clearObjectives ? "ObjectiveDraft" : "FirstAppraiserAssessment")}.",
            clearedObjectives = clearObjectives
        });
    }

    [HttpGet("workflow-notifications")]
    public async Task<IActionResult> GetWorkflowNotifications()
    {
        var configs = await _db.WorkflowNotificationConfigs.ToListAsync();
        return Ok(configs);
    }

    [HttpPost("workflow-notifications")]
    public async Task<IActionResult> SaveWorkflowNotifications([FromBody] List<Nbp.Pms.Domain.Entities.WorkflowNotificationConfig> configs)
    {
        var existing = await _db.WorkflowNotificationConfigs.ToListAsync();
        _db.WorkflowNotificationConfigs.RemoveRange(existing);
        
        // Reset IDs for bulk insert to avoid conflicts
        foreach (var c in configs)
        {
            c.Id = Guid.NewGuid();
        }
        
        _db.WorkflowNotificationConfigs.AddRange(configs);
        await _db.SaveChangesAsync();
        
        return Ok(new { message = "Workflow notification configurations saved successfully." });
    }

    [HttpPost("workflow-notifications/test")]
    public async Task<IActionResult> TestWorkflowNotification([FromBody] TestWorkflowNotificationDto dto, [FromServices] Nbp.Pms.Application.Interfaces.IEmailService emailService)
    {
        if (string.IsNullOrWhiteSpace(dto.RecipientEmail))
        {
            return BadRequest(new { message = "Recipient Email Address is required." });
        }

        var subject = $"[NBP PMS 2.0] Test Workflow Notification: {dto.TransitionKey}";
        var body = $"This is a test workflow notification dispatched from the NBP PMS 2.0 Workflow Engine Console for transition rule <strong>{dto.TransitionKey}</strong>.<br/><br/>If you are receiving this message, your workflow notification delivery pipeline is active and working correctly!";

        var success = await emailService.SendWorkflowNotificationAsync(dto.RecipientEmail.Trim(), dto.RecipientName ?? "Workflow Admin", subject, body);

        if (success)
        {
            return Ok(new { success = true, message = $"Test notification email sent successfully to {dto.RecipientEmail}!" });
        }
        else
        {
            return BadRequest(new { success = false, message = $"Failed to send test email to {dto.RecipientEmail}. Check your SMTP server configuration and logs." });
        }
    }

    [HttpGet("workflow-notifications/logs")]
    public async Task<IActionResult> GetWorkflowNotificationLogs([FromQuery] int limit = 50)
    {
        var logs = await _db.AuditEvents
            .Where(a => a.EventType == "NOTIFICATION_DISPATCHED" || a.EventType == "NOTIFICATION_DISPATCH_FAILED")
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToListAsync();

        return Ok(logs);
    }
}

public record ForceTransitionDto(string TargetStatus, string Justification, string ActorSapId = "admin");
public record TestWorkflowNotificationDto(string TransitionKey, string RecipientEmail, string? RecipientName = "Administrator");

