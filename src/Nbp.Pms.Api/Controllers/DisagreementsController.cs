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
        var cases = await _db.DisagreementCases
            .OrderByDescending(d => d.RaisedAt)
            .ToListAsync();
        var result = new List<object>();

        foreach (var c in cases)
        {
            var emp = await _db.Employees.FindAsync(c.EmployeeId);
            var empCycle = await _db.EmployeeCycles
                .Include(ec => ec.Cycle)
                .Include(ec => ec.FirstAppraiser)
                .Include(ec => ec.SecondAppraiser)
                .FirstOrDefaultAsync(ec => ec.Id == c.EmployeeCycleId);
            var score = await _db.Scores.FirstOrDefaultAsync(s => s.EmployeeCycleId == c.EmployeeCycleId);

            result.Add(new
            {
                c.Id,
                c.EmployeeCycleId,
                c.EmployeeId,
                SapId = emp?.SapId ?? empCycle?.Employee?.SapId ?? "N/A",
                EmployeeName = emp?.FullName ?? empCycle?.Employee?.FullName ?? "Unknown",
                Grade = emp?.Grade ?? empCycle?.SnapshotGrade ?? "N/A",
                Group = emp?.ReportingGroup ?? empCycle?.SnapshotReportingGroup ?? "N/A",
                CycleTitle = empCycle?.Cycle?.Title ?? "Annual Appraisal 2026",
                FirstAppraiserName = empCycle?.FirstAppraiser?.FullName ?? "1st Appraiser",
                SecondAppraiserName = empCycle?.SecondAppraiser?.FullName ?? "2nd Appraiser",
                PublishedRating = score != null ? score.FinalRatingLevel.ToString() : "Good",
                DisagreementReason = c.MandatoryDisagreementReason,
                MandatoryDisagreementReason = c.MandatoryDisagreementReason,
                c.AttachmentFileName,
                c.AttachmentFileData,
                c.AttachmentFileSizeBytes,
                c.AttachmentFileType,
                HasSupportingDocument = !string.IsNullOrEmpty(c.AttachmentFileName) || !string.IsNullOrEmpty(c.AttachmentFileData),
                c.Status,
                RaisedDate = c.RaisedAt.ToString("yyyy-MM-dd"),
                c.ResolutionNotes,
                c.ResolvedAt
            });
        }

        return Ok(result);
    }

    [HttpGet("{id}/attachment")]
    public async Task<IActionResult> GetAttachment(Guid id)
    {
        var disCase = await _db.DisagreementCases.FindAsync(id);
        if (disCase == null || (string.IsNullOrEmpty(disCase.AttachmentFileName) && string.IsNullOrEmpty(disCase.AttachmentFileData)))
        {
            return NotFound(new { message = "No supporting document attachment found for this disagreement case." });
        }

        return Ok(new
        {
            fileName = disCase.AttachmentFileName,
            fileData = disCase.AttachmentFileData,
            fileSize = disCase.AttachmentFileSizeBytes,
            fileType = disCase.AttachmentFileType ?? "application/octet-stream"
        });
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
