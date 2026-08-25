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

        var allCycleGroups = await _db.CycleReportingGroups.ToListAsync();
        var allMasterGroups = await _db.ReportingGroups.ToListAsync();
        var groupLookup = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var g in allCycleGroups)
        {
            if (!string.IsNullOrWhiteSpace(g.RpsaCode)) groupLookup[g.RpsaCode] = g.GroupName;
            if (!string.IsNullOrWhiteSpace(g.GroupCode)) groupLookup[g.GroupCode] = g.GroupName;
            groupLookup[g.GroupName] = g.GroupName;
        }
        foreach (var g in allMasterGroups)
        {
            if (!string.IsNullOrWhiteSpace(g.RpsaCode) && !groupLookup.ContainsKey(g.RpsaCode)) groupLookup[g.RpsaCode] = g.GroupName;
            if (!string.IsNullOrWhiteSpace(g.GroupCode) && !groupLookup.ContainsKey(g.GroupCode)) groupLookup[g.GroupCode] = g.GroupName;
            if (!groupLookup.ContainsKey(g.GroupName)) groupLookup[g.GroupName] = g.GroupName;
        }

        var allCycleGrades = await _db.CycleGradeMappings.ToListAsync();
        var allMasterGrades = await _db.GradeMappings.ToListAsync();
        var gradeLookup = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var gm in allCycleGrades)
        {
            if (!string.IsNullOrWhiteSpace(gm.EsgCode)) gradeLookup[gm.EsgCode] = gm.GradeName;
            if (!string.IsNullOrWhiteSpace(gm.GradeCode)) gradeLookup[gm.GradeCode] = gm.GradeName;
            gradeLookup[gm.GradeName] = gm.GradeName;
        }
        foreach (var gm in allMasterGrades)
        {
            if (!string.IsNullOrWhiteSpace(gm.EsgCode) && !gradeLookup.ContainsKey(gm.EsgCode)) gradeLookup[gm.EsgCode] = gm.GradeName;
            if (!string.IsNullOrWhiteSpace(gm.GradeCode) && !gradeLookup.ContainsKey(gm.GradeCode)) gradeLookup[gm.GradeCode] = gm.GradeName;
            if (!gradeLookup.ContainsKey(gm.GradeName)) gradeLookup[gm.GradeName] = gm.GradeName;
        }

        string ResolveGrade(string? g)
        {
            if (string.IsNullOrWhiteSpace(g)) return "AVP (ESG 06)";
            string clean = g.Trim();
            if (gradeLookup.TryGetValue(clean, out var name))
            {
                if (clean.Length <= 2 && int.TryParse(clean, out _))
                    return $"{name} (ESG {clean})";
                return name;
            }
            return clean switch
            {
                "01" => "President/CEO (ESG 01)",
                "02" => "SEVP (ESG 02)",
                "03" => "EVP (ESG 03)",
                "04" => "SVP (ESG 04)",
                "05" => "VP (ESG 05)",
                "06" => "AVP (ESG 06)",
                "07" => "OG I (ESG 07)",
                "08" => "OG II (ESG 08)",
                "09" => "OG III (ESG 09)",
                _ => g
            };
        }

        string ResolveGroup(string? grp)
        {
            if (string.IsNullOrWhiteSpace(grp)) return "Commercial Banking Group (RPSA 0001)";
            string clean = grp.Trim();
            if (groupLookup.TryGetValue(clean, out var name))
            {
                if (clean.Length <= 4 && int.TryParse(clean, out _))
                    return $"{name} (RPSA {clean})";
                return name;
            }
            return clean switch
            {
                "0001" or "1" => "Commercial Banking Group (RPSA 0001)",
                "0002" or "2" => "Consumer Banking Group (RPSA 0002)",
                "0003" or "3" => "Risk Management Group (RPSA 0003)",
                "0004" or "4" => "Treasury & Global Markets (RPSA 0004)",
                "0005" or "5" => "Information Technology Group (RPSA 0005)",
                "0006" or "6" => "Operations Group (RPSA 0006)",
                "0007" or "7" => "HR Management Group (RPSA 0007)",
                "0008" or "8" => "Compliance Group (RPSA 0008)",
                _ => grp
            };
        }

        var reviews = rawReviews.Select(ec =>
        {
            var emp = ec.Employee;

            // Resolve First Appraiser
            var faSap = ec.PendingFirstAppraiserSapId ?? ec.FirstAppraiser?.SapId ?? "10004";
            var fa = empLookup.TryGetValue(faSap, out var fVal) ? fVal : ec.FirstAppraiser;

            // Resolve Second Appraiser
            var saSap = ec.PendingSecondAppraiserSapId ?? ec.SecondAppraiser?.SapId ?? "10003";
            var sa = empLookup.TryGetValue(saSap, out var sVal) ? sVal : ec.SecondAppraiser;

            // Resolve Co-Appraiser
            var caSap = ec.PendingCoAppraiserSapId ?? ec.CoAppraiser?.SapId;
            var ca = (caSap != null && empLookup.TryGetValue(caSap, out var cVal)) ? cVal : ec.CoAppraiser;

            var empGrade = ec.SnapshotGrade ?? emp?.Grade ?? "06";
            var empGroup = ec.SnapshotReportingGroup ?? emp?.ReportingGroup ?? "0001";
            var empDesig = ec.SnapshotDesignation ?? emp?.Designation ?? "Assistant Vice President";
            var empLoc = ec.SnapshotLocation ?? emp?.Location ?? "Head Office, Karachi";

            return new
            {
                ec.Id,
                ec.EmployeeId,
                EmployeeName = emp?.FullName ?? "Fawaz Ahmed",
                SapId = emp?.SapId ?? "84920",
                Grade = ResolveGrade(empGrade),
                Designation = empDesig,
                Location = empLoc,
                Group = ResolveGroup(empGroup),
                Division = emp?.Division ?? "Commercial Banking",
                RegionBranch = emp?.RegionBranch ?? "Karachi Central Branch",
                ec.CurrentStatus,
                FormType = ec.AssignedFormType.ToString(),

                // First Appraiser Detailed Info
                FirstAppraiserName = fa?.FullName ?? "Tariq Mahmood",
                FirstAppraiserSapId = fa?.SapId ?? faSap,
                FirstAppraiserGrade = ResolveGrade(fa?.Grade ?? "05"),
                FirstAppraiserDesignation = fa?.Designation ?? "Regional Head",
                FirstAppraiserLocation = fa?.Location ?? "Karachi Region",
                FirstAppraiserGroup = ResolveGroup(fa?.ReportingGroup ?? "0001"),

                // Second Appraiser Detailed Info
                SecondAppraiserName = sa?.FullName ?? "Rashid Khan",
                SecondAppraiserSapId = sa?.SapId ?? saSap,
                SecondAppraiserGrade = ResolveGrade(sa?.Grade ?? "04"),
                SecondAppraiserDesignation = sa?.Designation ?? "Divisional Head",
                SecondAppraiserLocation = sa?.Location ?? "Head Office, Karachi",
                SecondAppraiserGroup = ResolveGroup(sa?.ReportingGroup ?? "0001"),

                // Co-Appraiser Detailed Info
                CoAppraiserName = ca?.FullName,
                CoAppraiserSapId = ca?.SapId ?? caSap,
                CoAppraiserGrade = ca != null ? ResolveGrade(ca.Grade) : null,
                CoAppraiserDesignation = ca?.Designation,
                CoAppraiserLocation = ca?.Location,
                CoAppraiserGroup = ca != null ? ResolveGroup(ca.ReportingGroup) : null,

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

    /// <summary>
    /// PMW Admin unlocks the confirmed reporting line so that the employee can make changes and re-request.
    /// </summary>
    [HttpPost("{id}/unlock-appraiser-line")]
    public async Task<IActionResult> UnlockAppraiserLine(Guid id, [FromBody] AdminAppraiserActionDto dto)
    {
        var empCycle = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .FirstOrDefaultAsync(ec => ec.Id == id);

        if (empCycle == null) return NotFound();

        empCycle.AppraiserValidationStatus = "UnlockedForRevision";
        empCycle.AppraiserRejectionReason = null;
        empCycle.PendingFirstAppraiserSapId = null;
        empCycle.PendingSecondAppraiserSapId = null;
        empCycle.PendingCoAppraiserSapId = null;
        empCycle.UpdatedAt = DateTime.UtcNow;

        var audit = new AuditEvent
        {
            EventType = "APPRAISER_LINE_UNLOCKED_BY_ADMIN",
            ActorUserId = dto.ActorSapId,
            ActorRole = "PmwAdmin",
            TargetEntityId = empCycle.Id.ToString(),
            TargetEntityType = nameof(EmployeeCycle),
            ActionDescription = $"PMW Admin {dto.ActorSapId} unlocked reporting line for employee {empCycle.Employee?.FullName} (SAP ID: {empCycle.Employee?.SapId}) to allow re-requesting.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Reporting line unlocked successfully. Employee is now permitted to submit a new appraiser line request.", employeeCycle = empCycle });
    }

    /// <summary>
    /// PMW Admin resets the appraiser line mapping completely.
    /// </summary>
    [HttpPost("{id}/reset-appraiser-line")]
    public async Task<IActionResult> ResetAppraiserLine(Guid id, [FromBody] AdminAppraiserActionDto dto)
    {
        var empCycle = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .FirstOrDefaultAsync(ec => ec.Id == id);

        if (empCycle == null) return NotFound();

        empCycle.FirstAppraiserId = null;
        empCycle.SecondAppraiserId = null;
        empCycle.CoAppraiserId = null;
        empCycle.PendingFirstAppraiserSapId = null;
        empCycle.PendingSecondAppraiserSapId = null;
        empCycle.PendingCoAppraiserSapId = null;
        empCycle.AppraiserValidationStatus = null;
        empCycle.AppraiserRejectionReason = null;
        empCycle.AppraiserValidatedAt = null;
        empCycle.AppraiserValidatedBySapId = null;
        empCycle.UpdatedAt = DateTime.UtcNow;

        var audit = new AuditEvent
        {
            EventType = "APPRAISER_LINE_RESET_BY_ADMIN",
            ActorUserId = dto.ActorSapId,
            ActorRole = "PmwAdmin",
            TargetEntityId = empCycle.Id.ToString(),
            TargetEntityType = nameof(EmployeeCycle),
            ActionDescription = $"PMW Admin {dto.ActorSapId} reset reporting line hierarchy for employee {empCycle.Employee?.FullName} (SAP ID: {empCycle.Employee?.SapId}).",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Reporting line hierarchy reset successfully.", employeeCycle = empCycle });
    }

    /// <summary>
    /// Appraiser evaluates employee objectives and behavioural traits, calculates score, and saves or submits the appraisal.
    /// </summary>
    [HttpPost("{id}/evaluate")]
    public async Task<IActionResult> EvaluateAppraisal(Guid id, [FromBody] SaveAppraiserEvaluationDto dto)
    {
        var empCycle = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Include(ec => ec.Cycle)
            .FirstOrDefaultAsync(ec => ec.Id == id);

        if (empCycle == null) return NotFound(new { message = "Appraisal record not found." });

        var objectives = await _db.Objectives.Where(o => o.EmployeeCycleId == id).ToListAsync();
        var traits = await _db.BehaviourTraits.Where(t => t.EmployeeCycleId == id).ToListAsync();

        // Update Objectives
        if (dto.Objectives != null)
        {
            foreach (var objDto in dto.Objectives)
            {
                var obj = objectives.FirstOrDefault(o => o.Id == objDto.Id);
                if (obj != null)
                {
                    if (dto.Role == "SecondAppraiser")
                    {
                        if (objDto.SecondAppraiserRating.HasValue) obj.SecondAppraiserRating = objDto.SecondAppraiserRating.Value;
                        if (!string.IsNullOrWhiteSpace(objDto.SecondAppraiserComments))
                            obj.EncryptedConfidentialComments = objDto.SecondAppraiserComments;
                    }
                    else
                    {
                        if (objDto.FirstAppraiserRating.HasValue) obj.FirstAppraiserRating = objDto.FirstAppraiserRating.Value;
                        if (!string.IsNullOrWhiteSpace(objDto.FirstAppraiserComments))
                            obj.EncryptedConfidentialComments = objDto.FirstAppraiserComments;
                    }
                    obj.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        // Update Traits
        if (dto.Traits != null)
        {
            foreach (var traitDto in dto.Traits)
            {
                var trait = traits.FirstOrDefault(t => t.Id == traitDto.Id);
                if (trait != null)
                {
                    if (dto.Role == "SecondAppraiser")
                    {
                        if (traitDto.SecondAppraiserRating.HasValue) trait.FirstAppraiserRating = traitDto.SecondAppraiserRating.Value;
                        if (!string.IsNullOrWhiteSpace(traitDto.SecondAppraiserComments))
                            trait.EncryptedConfidentialComments = traitDto.SecondAppraiserComments;
                    }
                    else
                    {
                        if (traitDto.FirstAppraiserRating.HasValue) trait.FirstAppraiserRating = traitDto.FirstAppraiserRating.Value;
                        if (!string.IsNullOrWhiteSpace(traitDto.FirstAppraiserComments))
                            trait.EncryptedConfidentialComments = traitDto.FirstAppraiserComments;
                    }
                }
            }
        }

        // Calculate and save composite score
        var calculatedScore = _calcService.CalculateAndEncryptScore(id, objectives, traits);
        var existingScore = await _db.Scores.FirstOrDefaultAsync(s => s.EmployeeCycleId == id);
        if (existingScore != null)
        {
            existingScore.ObjectiveTotalScore = calculatedScore.ObjectiveTotalScore;
            existingScore.TraitTotalScore = calculatedScore.TraitTotalScore;
            existingScore.FinalCompositeScore = calculatedScore.FinalCompositeScore;
            existingScore.FinalRatingLevel = calculatedScore.FinalRatingLevel;
            existingScore.EncryptedObjectiveScore = calculatedScore.EncryptedObjectiveScore;
            existingScore.EncryptedTraitScore = calculatedScore.EncryptedTraitScore;
            existingScore.EncryptedFinalScore = calculatedScore.EncryptedFinalScore;
            existingScore.EncryptedAppraiserComments = calculatedScore.EncryptedAppraiserComments;
            existingScore.CalculatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.Scores.Add(calculatedScore);
        }

        empCycle.UpdatedAt = DateTime.UtcNow;

        if (dto.Submit)
        {
            var targetStatus = dto.Role == "SecondAppraiser" ? WorkflowStatus.Published : WorkflowStatus.SecondAppraiserReview;
            var transitionResult = _workflowEngine.Transition(empCycle, targetStatus, dto.ActorSapId, dto.Role);
            if (transitionResult.Success && transitionResult.AuditLog != null)
            {
                _db.AuditEvents.Add(transitionResult.AuditLog);
            }
        }

        var audit = new AuditEvent
        {
            EventType = dto.Submit ? "APPRAISAL_EVALUATION_SUBMITTED" : "APPRAISAL_EVALUATION_DRAFT_SAVED",
            ActorUserId = dto.ActorSapId,
            ActorRole = dto.Role,
            TargetEntityId = empCycle.Id.ToString(),
            TargetEntityType = nameof(EmployeeCycle),
            ActionDescription = $"Appraiser {dto.ActorSapId} {(dto.Submit ? "submitted" : "saved draft")} evaluation for employee {empCycle.Employee?.FullName} (SAP ID: {empCycle.Employee?.SapId}). Final Score: {calculatedScore.FinalCompositeScore:F2}, Rating: {calculatedScore.FinalRatingLevel}.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = dto.Submit ? "Appraisal evaluation submitted successfully to next review stage." : "Appraisal evaluation draft saved successfully.",
            score = calculatedScore,
            currentStatus = empCycle.CurrentStatus.ToString(),
            employeeCycle = empCycle
        });
    }
}

public record ConfirmAppraiserDto(string FirstAppraiserSapId, string SecondAppraiserSapId, string? CoAppraiserSapId, string ActorSapId = "10004");
public record RejectAppraiserDto(string RejectionReason, string ActorSapId = "10004");
public record AdminAppraiserActionDto(string ActorSapId = "admin");
public record SaveAppraiserEvaluationDto(
    List<ObjectiveRatingDto>? Objectives,
    List<TraitRatingDto>? Traits,
    string? FirstAppraiserComments,
    string? SecondAppraiserComments,
    string ActorSapId = "10004",
    string Role = "FirstAppraiser",
    bool Submit = false
);
public record ObjectiveRatingDto(Guid Id, int? FirstAppraiserRating, string? FirstAppraiserComments, int? SecondAppraiserRating, string? SecondAppraiserComments);
public record TraitRatingDto(Guid Id, int? FirstAppraiserRating, string? FirstAppraiserComments, int? SecondAppraiserRating, string? SecondAppraiserComments);

