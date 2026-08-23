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

        var allGroups = await _db.ReportingGroups.ToListAsync();
        var groupLookup = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var g in allGroups)
        {
            if (!string.IsNullOrWhiteSpace(g.RpsaCode)) groupLookup[g.RpsaCode] = g.GroupName;
            if (!string.IsNullOrWhiteSpace(g.GroupCode)) groupLookup[g.GroupCode] = g.GroupName;
            groupLookup[g.GroupName] = g.GroupName;
        }

        var allGrades = await _db.GradeMappings.ToListAsync();
        var gradeLookup = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var gm in allGrades)
        {
            if (!string.IsNullOrWhiteSpace(gm.EsgCode)) gradeLookup[gm.EsgCode] = gm.GradeName;
            if (!string.IsNullOrWhiteSpace(gm.GradeCode)) gradeLookup[gm.GradeCode] = gm.GradeName;
            gradeLookup[gm.GradeName] = gm.GradeName;
        }

        string ResolveGrade(string? g)
        {
            if (string.IsNullOrWhiteSpace(g)) return "AVP";
            if (gradeLookup.TryGetValue(g, out var name)) return $"{name} ({g})";
            return g;
        }

        string ResolveGroup(string? grp)
        {
            if (string.IsNullOrWhiteSpace(grp)) return "Commercial Banking Group (0001)";
            if (groupLookup.TryGetValue(grp, out var name)) return $"{name} ({grp})";
            return grp;
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
}

public record ConfirmAppraiserDto(string FirstAppraiserSapId, string SecondAppraiserSapId, string? CoAppraiserSapId, string ActorSapId = "10004");
public record RejectAppraiserDto(string RejectionReason, string ActorSapId = "10004");
