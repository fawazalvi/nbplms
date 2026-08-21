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
        var appraiser = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == appraiserSapId);
        if (appraiser == null) return NotFound(new { message = "Appraiser not found." });

        var reviews = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Include(ec => ec.Cycle)
            .Include(ec => ec.FirstAppraiser)
            .Include(ec => ec.SecondAppraiser)
            .Where(ec => ec.FirstAppraiserId == appraiser.Id || ec.SecondAppraiserId == appraiser.Id || ec.PendingFirstAppraiserSapId == appraiserSapId || ec.PendingSecondAppraiserSapId == appraiserSapId)
            .Select(ec => new
            {
                ec.Id,
                ec.EmployeeId,
                EmployeeName = ec.Employee!.FullName,
                SapId = ec.Employee.SapId,
                Grade = ec.Employee.Grade,
                Group = ec.Employee.ReportingGroup,
                ec.CurrentStatus,
                FormType = ec.AssignedFormType.ToString(),
                FirstAppraiserName = ec.FirstAppraiser != null ? ec.FirstAppraiser.FullName : null,
                FirstAppraiserSapId = ec.FirstAppraiser != null ? ec.FirstAppraiser.SapId : null,
                SecondAppraiserName = ec.SecondAppraiser != null ? ec.SecondAppraiser.FullName : null,
                SecondAppraiserSapId = ec.SecondAppraiser != null ? ec.SecondAppraiser.SapId : null,
                ec.AppraiserValidationStatus,
                ec.PendingFirstAppraiserSapId,
                ec.PendingSecondAppraiserSapId,
                ec.AppraiserRejectionReason
            })
            .ToListAsync();

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
