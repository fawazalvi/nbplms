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

    [HttpGet("my-cycles")]
    public async Task<IActionResult> GetMyActiveCycles([FromQuery] string sapId = "84920")
    {
        var activeCycles = await _db.EmployeeCycles
            .Include(ec => ec.Cycle)
            .Include(ec => ec.Employee)
            .Include(ec => ec.FirstAppraiser)
            .Include(ec => ec.SecondAppraiser)
            .Where(ec => ec.Employee!.SapId == sapId)
            .OrderByDescending(ec => ec.Cycle != null ? ec.Cycle.StartDate : ec.CreatedAt)
            .Select(ec => new
            {
                EmployeeCycleId = ec.Id,
                CycleId = ec.CycleId,
                CycleTitle = ec.Cycle != null ? ec.Cycle.Title : "Annual Appraisal Cycle",
                CircularReference = ec.Cycle != null ? ec.Cycle.CircularReference : "NBP/HR/2026/01",
                StartDate = ec.Cycle != null ? ec.Cycle.StartDate : DateTime.UtcNow,
                EndDate = ec.Cycle != null ? ec.Cycle.EndDate : DateTime.UtcNow.AddMonths(3),
                AcknowledgementDeadline = ec.Cycle != null ? ec.Cycle.AcknowledgementDeadline : DateTime.UtcNow.AddMonths(4),
                CurrentStatus = ec.CurrentStatus.ToString(),
                CurrentStatusCode = (int)ec.CurrentStatus,
                AssignedFormType = ec.AssignedFormType.ToString(),
                AppraiserValidationStatus = ec.AppraiserValidationStatus ?? "Draft",
                IsCycleActive = ec.Cycle != null && ec.Cycle.Status != WorkflowStatus.CycleClosed,
                SnapshotGrade = ec.SnapshotGrade ?? ec.Employee!.Grade,
                SnapshotDesignation = ec.SnapshotDesignation ?? ec.Employee!.Designation,
                SnapshotReportingGroup = ec.SnapshotReportingGroup ?? ec.Employee!.ReportingGroup,
                FirstAppraiserName = ec.FirstAppraiser != null ? ec.FirstAppraiser.FullName : null,
                FirstAppraiserSapId = ec.FirstAppraiser != null ? ec.FirstAppraiser.SapId : null,
                SecondAppraiserName = ec.SecondAppraiser != null ? ec.SecondAppraiser.FullName : null,
                SecondAppraiserSapId = ec.SecondAppraiser != null ? ec.SecondAppraiser.SapId : null
            })
            .ToListAsync();

        return Ok(activeCycles);
    }

    [HttpGet("my-cycle")]
    public async Task<IActionResult> GetMyActiveAppraisal([FromQuery] string sapId = "84920", [FromQuery] Guid? cycleId = null, [FromQuery] Guid? employeeCycleId = null)
    {
        var query = _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Include(ec => ec.Cycle)
            .Include(ec => ec.FirstAppraiser)
            .Include(ec => ec.SecondAppraiser)
            .Include(ec => ec.CoAppraiser)
            .AsQueryable();

        if (employeeCycleId.HasValue)
        {
            query = query.Where(ec => ec.Id == employeeCycleId.Value);
        }
        else if (cycleId.HasValue)
        {
            query = query.Where(ec => ec.Employee!.SapId == sapId && ec.CycleId == cycleId.Value);
        }
        else
        {
            query = query.Where(ec => ec.Employee!.SapId == sapId)
                .OrderByDescending(ec => ec.UpdatedAt ?? ec.CreatedAt);
        }

        var empCycle = await query.FirstOrDefaultAsync();

        if (empCycle == null)
        {
            return NotFound(new { message = "No active appraisal cycle found for this employee." });
        }

        // If First/Second/Co appraiser navigation properties are null but SAP IDs exist, resolve them
        if (empCycle.FirstAppraiser == null && !string.IsNullOrWhiteSpace(empCycle.PendingFirstAppraiserSapId))
        {
            empCycle.FirstAppraiser = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == empCycle.PendingFirstAppraiserSapId);
        }
        if (empCycle.SecondAppraiser == null && !string.IsNullOrWhiteSpace(empCycle.PendingSecondAppraiserSapId))
        {
            empCycle.SecondAppraiser = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == empCycle.PendingSecondAppraiserSapId);
        }
        if (empCycle.CoAppraiser == null && !string.IsNullOrWhiteSpace(empCycle.PendingCoAppraiserSapId))
        {
            empCycle.CoAppraiser = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == empCycle.PendingCoAppraiserSapId);
        }

        var objectives = await _db.Objectives.Where(o => o.EmployeeCycleId == empCycle.Id).ToListAsync();
        var traits = await _db.BehaviourTraits.Where(t => t.EmployeeCycleId == empCycle.Id).ToListAsync();
        var score = await _db.Scores.FirstOrDefaultAsync(s => s.EmployeeCycleId == empCycle.Id);
        var developmentReview = await _db.DevelopmentReviews.FirstOrDefaultAsync(d => d.EmployeeCycleId == empCycle.Id);

        return Ok(new
        {
            employeeCycle = empCycle,
            objectives,
            traits,
            score,
            developmentReview
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

    [HttpGet("history")]
    public async Task<IActionResult> GetAppraisalHistory([FromQuery] string sapId = "84920")
    {
        var historicalCycles = await _db.EmployeeCycles
            .Include(ec => ec.Cycle)
            .Include(ec => ec.Employee)
            .Include(ec => ec.FirstAppraiser)
            .Include(ec => ec.SecondAppraiser)
            .Where(ec => ec.Employee!.SapId == sapId && (ec.CurrentStatus == WorkflowStatus.EmployeeAgreed || ec.CurrentStatus == WorkflowStatus.DisagreementResolved || ec.CurrentStatus == WorkflowStatus.AdministrativelyCompleted || (ec.Cycle != null && ec.Cycle.Status == WorkflowStatus.CycleClosed)))
            .Select(ec => new
            {
                ec.Id,
                CycleName = ec.Cycle != null ? ec.Cycle.Title : "Appraisal Cycle",
                CycleYear = ec.Cycle != null ? ec.Cycle.StartDate.Year : 2025,
                FormType = ec.AssignedFormType.ToString(),
                Status = ec.CurrentStatus.ToString(),
                FirstAppraiserName = ec.FirstAppraiser != null ? ec.FirstAppraiser.FullName : "Tariq Mahmood",
                SecondAppraiserName = ec.SecondAppraiser != null ? ec.SecondAppraiser.FullName : "Rashid Khan",
                FinalRating = "Very Good (ESG 06)",
                FinalScore = 84.5,
                CompletedAt = ec.AcknowledgedAt ?? ec.UpdatedAt ?? ec.CreatedAt
            })
            .ToListAsync();

        // If no past cycles in DB yet, provide seed historical reference for UX continuity
        if (historicalCycles.Count == 0)
        {
            return Ok(new[]
            {
                new {
                    Id = Guid.NewGuid(),
                    CycleName = "Annual Performance Appraisal 2025",
                    CycleYear = 2025,
                    FormType = "KPI_FORM",
                    Status = "EmployeeAgreed",
                    FirstAppraiserName = "Tariq Mahmood (VP - ESG 05)",
                    SecondAppraiserName = "Rashid Khan (SVP - ESG 04)",
                    FinalRating = "Very Good",
                    FinalScore = 86.4,
                    CompletedAt = (DateTime?)new DateTime(2026, 1, 15)
                },
                new {
                    Id = Guid.NewGuid(),
                    CycleName = "Annual Performance Appraisal 2024",
                    CycleYear = 2024,
                    FormType = "KPI_FORM",
                    Status = "EmployeeAgreed",
                    FirstAppraiserName = "Tariq Mahmood (VP - ESG 05)",
                    SecondAppraiserName = "Rashid Khan (SVP - ESG 04)",
                    FinalRating = "Outstanding",
                    FinalScore = 91.2,
                    CompletedAt = (DateTime?)new DateTime(2025, 1, 18)
                }
            });
        }

        return Ok(historicalCycles);
    }

    [HttpPost("{id}/agree")]
    public async Task<IActionResult> RecordAgreement(Guid id, [FromQuery] string actorUserId = "84920")
    {
        var empCycle = await _db.EmployeeCycles.FindAsync(id);
        if (empCycle == null) return NotFound();

        var result = _workflowEngine.Transition(empCycle, WorkflowStatus.EmployeeAgreed, actorUserId, "Employee");
        if (!result.Success) return BadRequest(new { message = result.Message });

        empCycle.AcknowledgedAt = DateTime.UtcNow;
        if (result.AuditLog != null) _db.AuditEvents.Add(result.AuditLog);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Appraisal acknowledged and agreed successfully. Form is now permanently locked.", currentStatus = empCycle.CurrentStatus });
    }

    [HttpPost("{id}/resolve-disagreement")]
    public async Task<IActionResult> ResolveDisagreement(Guid id, [FromBody] ResolveDisagreementDto request)
    {
        var empCycle = await _db.EmployeeCycles.FindAsync(id);
        if (empCycle == null) return NotFound();

        var result = _workflowEngine.Transition(empCycle, WorkflowStatus.DisagreementResolved, request.ActorUserId, "PmwAdmin", comments: request.ResolutionNotes);
        if (!result.Success) return BadRequest(new { message = result.Message });

        var disCase = await _db.DisagreementCases.FirstOrDefaultAsync(d => d.EmployeeCycleId == id);
        if (disCase != null)
        {
            disCase.Status = "Resolved";
            disCase.ResolutionNotes = request.ResolutionNotes;
            disCase.ResolvedAt = DateTime.UtcNow;
            if (Guid.TryParse(request.ActorUserId, out var actorGuid))
            {
                disCase.ResolvedByUserId = actorGuid;
            }
        }

        if (result.AuditLog != null) _db.AuditEvents.Add(result.AuditLog);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Disagreement resolved successfully. Form is now finalized.", currentStatus = empCycle.CurrentStatus });
    }
}

public record RequestAppraiserUpdateDto(string FirstAppraiserSapId, string SecondAppraiserSapId, string? CoAppraiserSapId);
public record DisagreementRequestDto(string SapId, string Reason);
public record ResolveDisagreementDto(string ActorUserId, string ResolutionNotes);
