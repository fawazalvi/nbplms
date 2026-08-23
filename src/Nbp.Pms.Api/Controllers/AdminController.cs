using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AdminController : ControllerBase
{
    private readonly PmsDbContext _db;
    private readonly DbSeederService _seeder;

    public AdminController(PmsDbContext db, DbSeederService seeder)
    {
        _db = db;
        _seeder = seeder;
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
}
