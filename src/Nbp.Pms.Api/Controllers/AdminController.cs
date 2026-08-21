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
            employeesCount = await _db.Employees.CountAsync(),
            cyclesCount = await _db.AppraisalCycles.CountAsync(),
            employeeCyclesCount = await _db.EmployeeCycles.CountAsync(),
            formTemplatesCount = await _db.FormTemplates.CountAsync(),
            objectivesCount = await _db.Objectives.CountAsync(),
            traitsCount = await _db.BehaviourTraits.CountAsync(),
            scoresCount = await _db.Scores.CountAsync(),
            developmentReviewsCount = await _db.DevelopmentReviews.CountAsync(),
            disagreementCasesCount = await _db.DisagreementCases.CountAsync(),
            bellCurvePoliciesCount = await _db.BellCurvePolicies.CountAsync(),
            auditEventsCount = await _db.AuditEvents.CountAsync(),
            timestamp = DateTime.UtcNow
        };

        return Ok(status);
    }

    /// <summary>
    /// Wipes all database tables cleanly.
    /// </summary>
    [HttpPost("clean")]
    public async Task<IActionResult> CleanDatabase()
    {
        await _seeder.CleanDatabaseAsync();
        return Ok(new { message = "Database cleaned successfully. All tables reset.", timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Wipes and populates realistic NBP sample data into Microsoft SQL Server.
    /// </summary>
    [HttpPost("seed")]
    public async Task<IActionResult> SeedDatabase()
    {
        await _seeder.CleanDatabaseAsync();
        await _seeder.SeedDatabaseAsync();

        var counts = new
        {
            employees = await _db.Employees.CountAsync(),
            cycles = await _db.AppraisalCycles.CountAsync(),
            objectives = await _db.Objectives.CountAsync(),
            scores = await _db.Scores.CountAsync(),
            disagreements = await _db.DisagreementCases.CountAsync(),
            auditEvents = await _db.AuditEvents.CountAsync()
        };

        return Ok(new
        {
            message = "Sample NBP data successfully populated into database.",
            recordCounts = counts,
            timestamp = DateTime.UtcNow
        });
    }
}
