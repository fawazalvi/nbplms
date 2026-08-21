using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Application.Services;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class BellCurveController : ControllerBase
{
    private readonly PmsDbContext _db;
    private readonly BellCurveEngine _engine;

    public BellCurveController(PmsDbContext db, BellCurveEngine engine)
    {
        _db = db;
        _engine = engine;
    }

    [HttpGet("distribution")]
    public async Task<IActionResult> GetDistribution([FromQuery] string group = "Commercial Banking Group", [FromQuery] string grade = "AVP")
    {
        string groupName = (group ?? "").Trim();
        string gradeCode = (grade ?? "").Trim();

        var scores = await _db.Scores.ToListAsync();
        var policy = await _db.BellCurvePolicies
            .FirstOrDefaultAsync(p => p.TargetGroup.Trim() == groupName && p.TargetGrade.Trim() == gradeCode);

        if (policy == null)
        {
            var activeCycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Status == WorkflowStatus.CycleActive)
                              ?? await _db.AppraisalCycles.OrderByDescending(c => c.CreatedAt).FirstOrDefaultAsync();

            policy = new BellCurvePolicy
            {
                Id = Guid.NewGuid(),
                CycleId = activeCycle?.Id ?? Guid.NewGuid(),
                TargetGroup = groupName,
                TargetGrade = gradeCode,
                TargetOutstandingPercentage = 10.0m,
                TargetVeryGoodPercentage = 25.0m,
                TargetGoodPercentage = 50.0m,
                TargetNeedsImprovementPercentage = 10.0m,
                TargetUnsatisfactoryPercentage = 5.0m
            };
        }

        var summary = _engine.CalculateDistribution(scores, policy);

        return Ok(new
        {
            policy,
            distribution = summary,
            chartData = new[]
            {
                new { rating = "Outstanding", target = policy.TargetOutstandingPercentage, actual = summary.OutstandingActualPercentage },
                new { rating = "Very Good", target = policy.TargetVeryGoodPercentage, actual = summary.VeryGoodActualPercentage },
                new { rating = "Good", target = policy.TargetGoodPercentage, actual = summary.GoodActualPercentage },
                new { rating = "Needs Improvement", target = policy.TargetNeedsImprovementPercentage, actual = summary.NeedsImprovementActualPercentage },
                new { rating = "Unsatisfactory", target = policy.TargetUnsatisfactoryPercentage, actual = summary.UnsatisfactoryActualPercentage }
            }
        });
    }

    /// <summary>
    /// Updates or configures the prescribed Bell Curve policy target percentages for a specific Cycle, Group, and Grade.
    /// </summary>
    [HttpPost("policy")]
    public async Task<IActionResult> SavePolicy([FromBody] UpdateBellCurvePolicyDto dto)
    {
        decimal total = dto.TargetOutstanding + dto.TargetVeryGood + dto.TargetGood + dto.TargetNeedsImprovement + dto.TargetUnsatisfactory;
        if (Math.Abs(total - 100.0m) > 0.1m)
        {
            return BadRequest(new { message = $"Policy target percentages must sum to exactly 100%. Current sum: {total}%" });
        }

        string groupName = (dto.Group ?? "").Trim();
        string gradeCode = (dto.Grade ?? "").Trim();

        var activeCycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Status == WorkflowStatus.CycleActive)
                          ?? await _db.AppraisalCycles.OrderByDescending(c => c.CreatedAt).FirstOrDefaultAsync();

        var policy = await _db.BellCurvePolicies
            .FirstOrDefaultAsync(p => p.TargetGroup.Trim() == groupName && p.TargetGrade.Trim() == gradeCode);

        if (policy == null)
        {
            policy = new BellCurvePolicy
            {
                Id = Guid.NewGuid(),
                CycleId = activeCycle?.Id ?? Guid.NewGuid(),
                TargetGroup = groupName,
                TargetGrade = gradeCode
            };
            _db.BellCurvePolicies.Add(policy);
        }

        policy.TargetGroup = groupName;
        policy.TargetGrade = gradeCode;
        policy.TargetOutstandingPercentage = dto.TargetOutstanding;
        policy.TargetVeryGoodPercentage = dto.TargetVeryGood;
        policy.TargetGoodPercentage = dto.TargetGood;
        policy.TargetNeedsImprovementPercentage = dto.TargetNeedsImprovement;
        policy.TargetUnsatisfactoryPercentage = dto.TargetUnsatisfactory;
        policy.UpdatedAt = DateTime.UtcNow;

        var audit = new AuditEvent
        {
            EventType = "BELL_CURVE_POLICY_UPDATED",
            ActorUserId = dto.ActorUserId,
            ActorRole = "PmwAdmin",
            ActionDescription = $"Updated Bell Curve policy targets for {groupName} ({gradeCode}): Outstanding={dto.TargetOutstanding}%, VeryGood={dto.TargetVeryGood}%, Good={dto.TargetGood}%, NeedsImprovement={dto.TargetNeedsImprovement}%, Unsatisfactory={dto.TargetUnsatisfactory}%.",
            Timestamp = DateTime.UtcNow
        };

        _db.AuditEvents.Add(audit);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Bell curve policy target percentages updated successfully.", policy });
    }

    [HttpPost("exceptions")]
    public async Task<IActionResult> ApproveException([FromBody] ExceptionApprovalDto dto)
    {
        string groupName = (dto.Group ?? "").Trim();
        string gradeCode = (dto.Grade ?? "").Trim();

        var activeCycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Status == WorkflowStatus.CycleActive)
                          ?? await _db.AppraisalCycles.OrderByDescending(c => c.CreatedAt).FirstOrDefaultAsync();

        var policy = await _db.BellCurvePolicies
            .FirstOrDefaultAsync(p => p.TargetGroup.Trim() == groupName && p.TargetGrade.Trim() == gradeCode);

        if (policy == null)
        {
            policy = new BellCurvePolicy
            {
                Id = Guid.NewGuid(),
                CycleId = activeCycle?.Id ?? Guid.NewGuid(),
                TargetGroup = groupName,
                TargetGrade = gradeCode
            };
            _db.BellCurvePolicies.Add(policy);
        }

        policy.TargetGroup = groupName;
        policy.TargetGrade = gradeCode;
        policy.ExceptionRationale = dto.Rationale;
        policy.ExceptionApprovedByPmw = true;
        policy.UpdatedAt = DateTime.UtcNow;

        var audit = new AuditEvent
        {
            EventType = "BELL_CURVE_EXCEPTION_APPROVED",
            ActorUserId = dto.ActorUserId,
            ActorRole = "PmwAdmin",
            ActionDescription = $"Approved rating distribution exception for {groupName} ({gradeCode}). Rationale: {dto.Rationale}",
            Timestamp = DateTime.UtcNow
        };

        _db.AuditEvents.Add(audit);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Exception rationale recorded and audited.", policy });
    }
}

public record UpdateBellCurvePolicyDto(
    string Group,
    string Grade,
    decimal TargetOutstanding,
    decimal TargetVeryGood,
    decimal TargetGood,
    decimal TargetNeedsImprovement,
    decimal TargetUnsatisfactory,
    string ActorUserId = "PMW_ADMIN"
);

public record ExceptionApprovalDto(
    string Group,
    string Grade,
    string Rationale,
    string ActorUserId = "PMW_ADMIN"
);
