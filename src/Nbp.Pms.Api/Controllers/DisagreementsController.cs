using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class DisagreementsController : ControllerBase
{
    private readonly PmsDbContext _db;

    public DisagreementsController(PmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetDisagreements()
    {
        var cases = await _db.DisagreementCases.ToListAsync();
        var result = new List<object>();

        foreach (var c in cases)
        {
            var emp = await _db.Employees.FindAsync(c.EmployeeId);
            result.Add(new
            {
                c.Id,
                c.EmployeeCycleId,
                c.EmployeeId,
                SapId = emp?.SapId ?? "N/A",
                EmployeeName = emp?.FullName ?? "Unknown",
                Grade = emp?.Grade ?? "N/A",
                Group = emp?.ReportingGroup ?? "N/A",
                PublishedRating = "Good",
                DisagreementReason = c.MandatoryDisagreementReason,
                c.Status,
                RaisedDate = c.RaisedAt.ToString("yyyy-MM-dd")
            });
        }

        return Ok(result);
    }

    [HttpPost("{id}/resolve")]
    public async Task<IActionResult> ResolveDisagreement(Guid id, [FromBody] DisagreementResolveDto dto)
    {
        var disCase = await _db.DisagreementCases.FindAsync(id);
        if (disCase == null) return NotFound();

        disCase.Status = "Resolved";
        disCase.ResolutionNotes = dto.ResolutionNotes;
        disCase.ResolvedAt = DateTime.UtcNow;

        var audit = new AuditEvent
        {
            EventType = "DISAGREEMENT_CASE_RESOLVED",
            ActorUserId = dto.ActorUserId,
            ActorRole = "PmwAdmin",
            TargetEntityId = id.ToString(),
            TargetEntityType = nameof(DisagreementCase),
            ActionDescription = $"Disagreement case {id} marked resolved. Notes: {dto.ResolutionNotes}",
            Timestamp = DateTime.UtcNow
        };

        _db.AuditEvents.Add(audit);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Disagreement case resolved successfully.", caseId = id });
    }
}

public record DisagreementResolveDto(string ResolutionNotes, string ActorUserId);
