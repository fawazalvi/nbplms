using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Application.Services;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AppraisersController : ControllerBase
{
    private readonly PmsDbContext _db;
    private readonly FormCalculationService _calcService;
    private readonly WorkflowEngine _workflowEngine;

    public AppraisersController(PmsDbContext db, FormCalculationService calcService, WorkflowEngine workflowEngine)
    {
        _db = db;
        _calcService = calcService;
        _workflowEngine = workflowEngine;
    }

    [HttpGet("team-reviews")]
    public async Task<IActionResult> GetTeamReviews([FromQuery] string appraiserSapId = "10004")
    {
        var appraiser = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == appraiserSapId || e.Email == appraiserSapId);
        var appraiserId = appraiser?.Id ?? Guid.Empty;

        var rawReviews = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Include(ec => ec.Cycle)
            .Include(ec => ec.FirstAppraiser)
            .Include(ec => ec.SecondAppraiser)
            .Include(ec => ec.CoAppraiser)
            .Where(ec => (appraiserId != Guid.Empty && (ec.FirstAppraiserId == appraiserId || ec.SecondAppraiserId == appraiserId || ec.CoAppraiserId == appraiserId)) || 
                         ec.PendingFirstAppraiserSapId == appraiserSapId || 
                         ec.PendingSecondAppraiserSapId == appraiserSapId ||
                         ec.PendingCoAppraiserSapId == appraiserSapId ||
                         (ec.FirstAppraiser != null && ec.FirstAppraiser.SapId == appraiserSapId) ||
                         (ec.SecondAppraiser != null && ec.SecondAppraiser.SapId == appraiserSapId) ||
                         (ec.CoAppraiser != null && ec.CoAppraiser.SapId == appraiserSapId))
            .ToListAsync();

        var allEmployees = await _db.Employees.ToListAsync();
        var empLookup = allEmployees.ToDictionary(e => e.SapId, StringComparer.OrdinalIgnoreCase);

        var reviews = rawReviews.Select(ec =>
        {
            var emp = ec.Employee;

            // Resolve First Appraiser
            var faSap = ec.PendingFirstAppraiserSapId ?? ec.FirstAppraiser?.SapId;
            var fa = (faSap != null && empLookup.TryGetValue(faSap, out var fVal)) ? fVal : ec.FirstAppraiser;

            // Resolve Second Appraiser
            var saSap = ec.PendingSecondAppraiserSapId ?? ec.SecondAppraiser?.SapId;
            var sa = (saSap != null && empLookup.TryGetValue(saSap, out var sVal)) ? sVal : ec.SecondAppraiser;

            // Resolve Co-Appraiser
            var caSap = ec.PendingCoAppraiserSapId ?? ec.CoAppraiser?.SapId;
            var ca = (caSap != null && empLookup.TryGetValue(caSap, out var cVal)) ? cVal : ec.CoAppraiser;

            return new
            {
                ec.Id,
                ec.EmployeeId,
                EmployeeName = emp?.FullName ?? "N/A",
                SapId = emp?.SapId ?? "N/A",
                Grade = ec.SnapshotGrade ?? emp?.Grade ?? "N/A",
                Designation = ec.SnapshotDesignation ?? emp?.Designation ?? "N/A",
                Location = ec.SnapshotLocation ?? emp?.Location ?? "N/A",
                Group = ec.SnapshotReportingGroup ?? emp?.ReportingGroup ?? "N/A",
                Division = emp?.Division,
                RegionBranch = emp?.RegionBranch,
                ec.CurrentStatus,
                FormType = ec.AssignedFormType.ToString(),

                // First Appraiser Detailed Info
                FirstAppraiserName = fa?.FullName ?? (ec.PendingFirstAppraiserSapId != null ? $"SAP: {ec.PendingFirstAppraiserSapId}" : null),
                FirstAppraiserSapId = fa?.SapId ?? ec.PendingFirstAppraiserSapId,
                FirstAppraiserGrade = fa?.Grade,
                FirstAppraiserDesignation = fa?.Designation,
                FirstAppraiserLocation = fa?.Location,
                FirstAppraiserGroup = fa?.ReportingGroup,

                // Second Appraiser Detailed Info
                SecondAppraiserName = sa?.FullName ?? (ec.PendingSecondAppraiserSapId != null ? $"SAP: {ec.PendingSecondAppraiserSapId}" : null),
                SecondAppraiserSapId = sa?.SapId ?? ec.PendingSecondAppraiserSapId,
                SecondAppraiserGrade = sa?.Grade,
                SecondAppraiserDesignation = sa?.Designation,
                SecondAppraiserLocation = sa?.Location,
                SecondAppraiserGroup = sa?.ReportingGroup,

                // Co-Appraiser Detailed Info
                CoAppraiserName = ca?.FullName ?? (ec.PendingCoAppraiserSapId != null ? $"SAP: {ec.PendingCoAppraiserSapId}" : null),
                CoAppraiserSapId = ca?.SapId ?? ec.PendingCoAppraiserSapId,
                CoAppraiserGrade = ca?.Grade,
                CoAppraiserDesignation = ca?.Designation,
                CoAppraiserLocation = ca?.Location,
                CoAppraiserGroup = ca?.ReportingGroup,

                ec.AppraiserValidationStatus,
                ec.PendingFirstAppraiserSapId,
                ec.PendingSecondAppraiserSapId,
                ec.PendingCoAppraiserSapId,
                ec.AppraiserRejectionReason
            };
        }).ToList();

        return Ok(reviews);
    }

    /// <summary>
    /// Appraiser confirms or modifies the First Appraiser and Second Appraiser (Supervisor) mapping requested by employee.
    /// </summary>
    [HttpPost("{id}/confirm-appraiser-mapping")]
    public async Task<IActionResult> ConfirmAppraiserMapping(Guid id, [FromBody] ConfirmAppraiserDto dto)
    {
        var empCycle = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .FirstOrDefaultAsync(ec => ec.Id == id);

        if (empCycle == null) return NotFound();

        string firstSap = dto.FirstAppraiserSapId?.Trim() ?? empCycle.PendingFirstAppraiserSapId ?? "";
        string secondSap = dto.SecondAppraiserSapId?.Trim() ?? empCycle.PendingSecondAppraiserSapId ?? "";

        var firstApp = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == firstSap);
        var secondApp = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == secondSap);

        if (firstApp != null) empCycle.FirstAppraiserId = firstApp.Id;
        if (secondApp != null) empCycle.SecondAppraiserId = secondApp.Id;

        empCycle.AppraiserValidationStatus = "Validated";
        empCycle.AppraiserValidatedAt = DateTime.UtcNow;
        empCycle.AppraiserValidatedBySapId = dto.ActorSapId;
        empCycle.PendingFirstAppraiserSapId = null;
        empCycle.PendingSecondAppraiserSapId = null;
        empCycle.PendingCoAppraiserSapId = null;
        empCycle.AppraiserRejectionReason = null;
        empCycle.UpdatedAt = DateTime.UtcNow;

        var audit = new AuditEvent
        {
            EventType = "APPRAISER_MAPPING_CONFIRMED",
            ActorUserId = dto.ActorSapId,
            ActorRole = "FirstAppraiser",
            TargetEntityId = empCycle.Id.ToString(),
            TargetEntityType = nameof(EmployeeCycle),
            ActionDescription = $"Confirmed Appraiser & Supervisor mapping for employee {empCycle.Employee?.FullName} (SAP ID: {empCycle.Employee?.SapId}). 1st Appraiser: {firstSap}, Supervisor: {secondSap}.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Appraiser and Supervisor mapping confirmed & validated successfully.", employeeCycle = empCycle });
    }

    /// <summary>
    /// Appraiser rejects the Appraiser & Supervisor mapping requested by employee.
    /// </summary>
    [HttpPost("{id}/reject-appraiser-mapping")]
    public async Task<IActionResult> RejectAppraiserMapping(Guid id, [FromBody] RejectAppraiserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RejectionReason))
        {
            return BadRequest(new { message = "Mandatory rejection reason is required." });
        }

        var empCycle = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .FirstOrDefaultAsync(ec => ec.Id == id);

        if (empCycle == null) return NotFound();

        empCycle.AppraiserValidationStatus = "Rejected";
        empCycle.AppraiserRejectionReason = dto.RejectionReason.Trim();
        empCycle.AppraiserValidatedAt = DateTime.UtcNow;
        empCycle.AppraiserValidatedBySapId = dto.ActorSapId;
        empCycle.UpdatedAt = DateTime.UtcNow;

        var audit = new AuditEvent
        {
            EventType = "APPRAISER_MAPPING_REJECTED",
            ActorUserId = dto.ActorSapId,
            ActorRole = "FirstAppraiser",
            TargetEntityId = empCycle.Id.ToString(),
            TargetEntityType = nameof(EmployeeCycle),
            ActionDescription = $"Rejected Appraiser & Supervisor mapping for employee {empCycle.Employee?.FullName} (SAP ID: {empCycle.Employee?.SapId}). Reason: {dto.RejectionReason}",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Appraiser mapping rejected. Employee must re-enter details.", employeeCycle = empCycle });
    }
}

public record ConfirmAppraiserDto(string FirstAppraiserSapId, string SecondAppraiserSapId, string? CoAppraiserSapId, string ActorSapId = "10004");
public record RejectAppraiserDto(string RejectionReason, string ActorSapId = "10004");
