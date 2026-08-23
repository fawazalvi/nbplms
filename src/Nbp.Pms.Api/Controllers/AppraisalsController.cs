using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Application.Services;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AppraisalsController : ControllerBase
{
    private readonly PmsDbContext _db;
    private readonly WorkflowEngine _workflowEngine;

    public AppraisalsController(PmsDbContext db, WorkflowEngine workflowEngine)
    {
        _db = db;
        _workflowEngine = workflowEngine;
    }

    [HttpGet("my-cycle")]
    public async Task<IActionResult> GetMyActiveAppraisal([FromQuery] string sapId = "84920")
    {
        var empCycle = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Include(ec => ec.Cycle)
            .Include(ec => ec.FirstAppraiser)
            .Include(ec => ec.SecondAppraiser)
            .FirstOrDefaultAsync(ec => ec.Employee!.SapId == sapId);

        if (empCycle == null)
        {
            return NotFound(new { message = "No active appraisal cycle found for this employee." });
        }

        var objectives = await _db.Objectives.Where(o => o.EmployeeCycleId == empCycle.Id).ToListAsync();
        var traits = await _db.BehaviourTraits.Where(t => t.EmployeeCycleId == empCycle.Id).ToListAsync();
        var score = await _db.Scores.FirstOrDefaultAsync(s => s.EmployeeCycleId == empCycle.Id);

        return Ok(new
        {
            employeeCycle = empCycle,
            objectives,
            traits,
            score
        });
    }

    /// <summary>
    /// Gets the complete audit trail history of changes made to KPIs, scoring, and comments for an appraisal form.
    /// Accessible to Auditors, Management, and Appraisers.
    /// </summary>
    [HttpGet("{id}/audit-history")]
    public async Task<IActionResult> GetFormAuditHistory(Guid id)
    {
        var logs = await _db.AppraisalFormAuditLogs
            .Where(a => a.EmployeeCycleId == id)
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync();

        return Ok(logs);
    }

    /// <summary>
    /// Records a granular change log entry for KPIs, scores, or comments.
    /// </summary>
    [HttpPost("{id}/log-change")]
    public async Task<IActionResult> LogFormChange(Guid id, [FromBody] AppraisalFormAuditLog log)
    {
        log.Id = Guid.NewGuid();
        log.EmployeeCycleId = id;
        log.Timestamp = DateTime.UtcNow;

        _db.AppraisalFormAuditLogs.Add(log);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Form change logged successfully.", logId = log.Id });
    }

    /// <summary>
    /// Employee updates or requests a change for their First Appraiser and Second Appraiser (Supervisor).
    /// </summary>
    [HttpPost("{id}/request-appraiser-update")]
    public async Task<IActionResult> RequestAppraiserUpdate(Guid id, [FromBody] RequestAppraiserUpdateDto dto)
    {
        var empCycle = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .FirstOrDefaultAsync(ec => ec.Id == id);
            
        if (empCycle == null) return NotFound();

        // Lock against re-requests if line is already validated by supervisor
        if (string.Equals(empCycle.AppraiserValidationStatus, "Validated", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Your reporting line has been confirmed and validated by your supervisor and is locked against modifications. Only PMW Admin can unlock or reset the reporting line." });
        }

        // Prevent concurrent duplicate requests if already pending confirmation
        if (string.Equals(empCycle.AppraiserValidationStatus, "PendingConfirmation", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Your previous appraiser update request is currently pending supervisor confirmation. Please wait for confirmation or rejection before submitting a new request." });
        }

        empCycle.PendingFirstAppraiserSapId = dto.FirstAppraiserSapId?.Trim();
        empCycle.PendingSecondAppraiserSapId = dto.SecondAppraiserSapId?.Trim();
        empCycle.PendingCoAppraiserSapId = dto.CoAppraiserSapId?.Trim();
        empCycle.AppraiserValidationStatus = "PendingConfirmation";
        empCycle.AppraiserRejectionReason = null;
        empCycle.UpdatedAt = DateTime.UtcNow;

        var audit = new AuditEvent
        {
            EventType = "APPRAISER_UPDATE_REQUESTED_BY_EMPLOYEE",
            ActorUserId = empCycle.Employee?.SapId ?? "EMPLOYEE",
            ActorRole = "Employee",
            TargetEntityId = empCycle.Id.ToString(),
            TargetEntityType = nameof(EmployeeCycle),
            ActionDescription = $"Requested Appraiser/Supervisor update: 1st Appraiser={dto.FirstAppraiserSapId}, 2nd Appraiser/Supervisor={dto.SecondAppraiserSapId}.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Appraiser & Supervisor update requested. Awaiting confirmation from your appraiser.", employeeCycle = empCycle });
    }

    [HttpPost("{id}/objectives")]
    public async Task<IActionResult> SaveObjectives(Guid id, [FromBody] List<Objective> objectives)
    {
        var empCycle = await _db.EmployeeCycles.FindAsync(id);
        if (empCycle == null) return NotFound();

        var existingObjs = await _db.Objectives.Where(o => o.EmployeeCycleId == id).ToListAsync();
        _db.Objectives.RemoveRange(existingObjs);

        foreach (var obj in objectives)
        {
            obj.Id = Guid.NewGuid();
            obj.EmployeeCycleId = id;
            _db.Objectives.Add(obj);
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Objectives saved successfully." });
    }

    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitSelfAssessment(Guid id, [FromQuery] string actorUserId = "84920", [FromQuery] string role = "Employee")
    {
        var empCycle = await _db.EmployeeCycles.FindAsync(id);
        if (empCycle == null) return NotFound();

        // Enforce Hard Constraint: Employee CANNOT submit until Appraiser & Supervisor information is validated!
        if (empCycle.AppraiserValidationStatus != "Validated")
        {
            return BadRequest(new { 
                message = $"Submission blocked: Your Appraiser & Supervisor information has not been validated yet (Current Status: {empCycle.AppraiserValidationStatus}). Please ask your appraiser to confirm your reporting line." 
            });
        }

        var result = _workflowEngine.Transition(empCycle, WorkflowStatus.FirstAppraiserAssessment, actorUserId, role);
        if (!result.Success) return BadRequest(new { message = result.Message });

        if (result.AuditLog != null) _db.AuditEvents.Add(result.AuditLog);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Self assessment submitted successfully.", currentStatus = empCycle.CurrentStatus });
    }

    [HttpPost("{id}/disagree")]
    public async Task<IActionResult> RecordDisagreement(Guid id, [FromBody] DisagreementRequestDto request)
    {
        var empCycle = await _db.EmployeeCycles.FindAsync(id);
        if (empCycle == null) return NotFound();

        var result = _workflowEngine.Transition(empCycle, WorkflowStatus.EmployeeDisagreed, request.SapId, "Employee", comments: request.Reason);
        if (!result.Success) return BadRequest(new { message = result.Message });

        var disCase = new DisagreementCase
        {
            EmployeeCycleId = id,
            EmployeeId = empCycle.EmployeeId,
            MandatoryDisagreementReason = request.Reason,
            Status = "PendingGpmReview"
        };
        _db.DisagreementCases.Add(disCase);

        if (result.AuditLog != null) _db.AuditEvents.Add(result.AuditLog);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Disagreement recorded successfully.", caseId = disCase.Id });
    }
}

public record RequestAppraiserUpdateDto(string FirstAppraiserSapId, string SecondAppraiserSapId, string? CoAppraiserSapId);
public record DisagreementRequestDto(string SapId, string Reason);
