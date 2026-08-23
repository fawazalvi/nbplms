using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;
using Nbp.Pms.Infrastructure.Services;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class CyclesController : ControllerBase
{
    private readonly PmsDbContext _db;

    public CyclesController(PmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetCycles()
    {
        var cycles = await _db.AppraisalCycles
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.CircularReference,
                c.StartDate,
                c.EndDate,
                c.AcknowledgementDeadline,
                Status = (int)c.Status,
                StatusName = c.Status.ToString(),
                c.MultipleActiveCyclesAllowed,
                c.CreatedAt,
                c.UpdatedAt,
                EnrolledCount = _db.EmployeeCycles.Count(ec => ec.CycleId == c.Id)
            })
            .ToListAsync();

        return Ok(cycles);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCycleById(Guid id)
    {
        var cycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Id == id);
        if (cycle == null) return NotFound(new { message = "Cycle not found." });

        var enrolledCount = await _db.EmployeeCycles.CountAsync(ec => ec.CycleId == id);
        var completedCount = await _db.EmployeeCycles.CountAsync(ec => ec.CycleId == id && ec.CurrentStatus == WorkflowStatus.CycleClosed);

        return Ok(new
        {
            cycle.Id,
            cycle.Title,
            cycle.CircularReference,
            cycle.StartDate,
            cycle.EndDate,
            cycle.AcknowledgementDeadline,
            Status = (int)cycle.Status,
            StatusName = cycle.Status.ToString(),
            cycle.MultipleActiveCyclesAllowed,
            cycle.CreatedAt,
            cycle.UpdatedAt,
            EnrolledCount = enrolledCount,
            CompletedCount = completedCount
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateCycle([FromBody] CreateCycleDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        var cycle = new AppraisalCycle
        {
            Title = dto.Title.Trim(),
            CircularReference = dto.CircularReference?.Trim() ?? $"NBP/HR/{DateTime.UtcNow.Year}/001",
            StartDate = dto.StartDate ?? DateTime.UtcNow,
            EndDate = dto.EndDate ?? DateTime.UtcNow.AddYears(1),
            AcknowledgementDeadline = dto.AcknowledgementDeadline ?? DateTime.UtcNow.AddMonths(11),
            Status = WorkflowStatus.CycleDraft,
            MultipleActiveCyclesAllowed = dto.MultipleActiveCyclesAllowed
        };

        _db.AppraisalCycles.Add(cycle);

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_CREATED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(AppraisalCycle),
            TargetEntityId = cycle.Id.ToString(),
            ActionDescription = $"Created Appraisal Cycle '{cycle.Title}' (Circular: {cycle.CircularReference}).",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(cycle);
    }

    [HttpPost("{id}/open")]
    public async Task<IActionResult> OpenCycle(Guid id, [FromQuery] string? actorUserId)
    {
        var cycle = await _db.AppraisalCycles.FindAsync(id);
        if (cycle == null) return NotFound();

        cycle.Status = WorkflowStatus.CycleActive;
        cycle.UpdatedAt = DateTime.UtcNow;

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_ACTIVATED",
            ActorUserId = actorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(AppraisalCycle),
            TargetEntityId = id.ToString(),
            ActionDescription = $"Activated Appraisal Cycle '{cycle.Title}'.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Cycle activated successfully.", cycle });
    }

    [HttpPost("{id}/suspend")]
    public async Task<IActionResult> SuspendCycle(Guid id, [FromQuery] string? actorUserId)
    {
        var cycle = await _db.AppraisalCycles.FindAsync(id);
        if (cycle == null) return NotFound();

        cycle.Status = WorkflowStatus.CycleSuspended;
        cycle.UpdatedAt = DateTime.UtcNow;

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_SUSPENDED",
            ActorUserId = actorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(AppraisalCycle),
            TargetEntityId = id.ToString(),
            ActionDescription = $"Suspended Appraisal Cycle '{cycle.Title}'.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Cycle suspended.", cycle });
    }

    [HttpPost("{id}/close")]
    public async Task<IActionResult> CloseCycle(Guid id, [FromQuery] string? actorUserId)
    {
        var cycle = await _db.AppraisalCycles.FindAsync(id);
        if (cycle == null) return NotFound();

        cycle.Status = WorkflowStatus.CycleClosed;
        cycle.UpdatedAt = DateTime.UtcNow;

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_CLOSED",
            ActorUserId = actorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(AppraisalCycle),
            TargetEntityId = id.ToString(),
            ActionDescription = $"Closed Appraisal Cycle '{cycle.Title}'.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Cycle closed.", cycle });
    }

    #region Cycle Employee Roster & Historical Snapshot Management

    /// <summary>
    /// Gets all employees enrolled in a specific appraisal cycle with their historical snapshots at cycle time.
    /// </summary>
    [HttpGet("{cycleId}/employees")]
    public async Task<IActionResult> GetCycleEmployees(
        Guid cycleId,
        [FromQuery] string? group,
        [FromQuery] string? grade,
        [FromQuery] string? search)
    {
        var query = _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Include(ec => ec.FirstAppraiser)
            .Include(ec => ec.SecondAppraiser)
            .Where(ec => ec.CycleId == cycleId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(group) && group != "All Groups")
        {
            query = query.Where(ec => (ec.SnapshotReportingGroup ?? ec.Employee!.ReportingGroup) == group);
        }

        if (!string.IsNullOrWhiteSpace(grade) && grade != "All Grades")
        {
            query = query.Where(ec => (ec.SnapshotGrade ?? ec.Employee!.Grade) == grade);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(ec =>
                ec.Employee!.FullName.Contains(search) ||
                ec.Employee!.SapId.Contains(search) ||
                (ec.SnapshotDesignation != null && ec.SnapshotDesignation.Contains(search)));
        }

        var roster = await query
            .OrderBy(ec => ec.Employee!.SapId)
            .Select(ec => new
            {
                EmployeeCycleId = ec.Id,
                ec.EmployeeId,
                SapId = ec.Employee!.SapId,
                FullName = ec.Employee!.FullName,
                Email = ec.Employee!.Email,
                
                // Historical Snapshot Values (with fallback to current master if not explicitly frozen)
                SnapshotGrade = ec.SnapshotGrade ?? ec.Employee!.Grade,
                SnapshotDesignation = ec.SnapshotDesignation ?? ec.Employee!.Designation,
                SnapshotReportingGroup = ec.SnapshotReportingGroup ?? ec.Employee!.ReportingGroup,
                SnapshotDivision = ec.SnapshotDivision ?? ec.Employee!.Division,
                SnapshotWingDepartment = ec.SnapshotWingDepartment ?? ec.Employee!.WingDepartment,
                SnapshotRegionBranch = ec.SnapshotRegionBranch ?? ec.Employee!.RegionBranch,
                SnapshotLocation = ec.SnapshotLocation ?? ec.Employee!.Location,
                SnapshotIsMrtOrMrc = ec.SnapshotIsMrtOrMrc ?? ec.Employee!.IsMrtOrMrc,

                AssignedFormType = ec.AssignedFormType.ToString(),
                CurrentStatus = ec.CurrentStatus.ToString(),
                CurrentStatusCode = (int)ec.CurrentStatus,

                FirstAppraiserId = ec.FirstAppraiserId,
                FirstAppraiserSapId = ec.FirstAppraiser != null ? ec.FirstAppraiser.SapId : ec.Employee!.FirstAppraiser != null ? ec.Employee!.FirstAppraiser.SapId : null,
                FirstAppraiserName = ec.FirstAppraiser != null ? ec.FirstAppraiser.FullName : ec.Employee!.FirstAppraiser != null ? ec.Employee!.FirstAppraiser.FullName : null,

                SecondAppraiserId = ec.SecondAppraiserId,
                SecondAppraiserSapId = ec.SecondAppraiser != null ? ec.SecondAppraiser.SapId : ec.Employee!.SecondAppraiser != null ? ec.Employee!.SecondAppraiser.SapId : null,
                SecondAppraiserName = ec.SecondAppraiser != null ? ec.SecondAppraiser.FullName : ec.Employee!.SecondAppraiser != null ? ec.Employee!.SecondAppraiser.FullName : null,

                ec.AppraiserValidationStatus,
                ec.CreatedAt,
                ec.UpdatedAt
            })
            .ToListAsync();

        return Ok(roster);
    }

    /// <summary>
    /// Enrolls an employee or bulk employees into an appraisal cycle, creating their historical snapshot at enrollment time.
    /// </summary>
    [HttpPost("{cycleId}/employees/enroll")]
    public async Task<IActionResult> EnrollEmployeesInCycle(Guid cycleId, [FromBody] EnrollCycleEmployeesDto dto)
    {
        var cycle = await _db.AppraisalCycles.FindAsync(cycleId);
        if (cycle == null) return NotFound(new { message = "Appraisal Cycle not found." });

        var alreadyEnrolledEmployeeIds = await _db.EmployeeCycles
            .Where(ec => ec.CycleId == cycleId)
            .Select(ec => ec.EmployeeId)
            .ToListAsync();

        var employeesToEnroll = new List<Employee>();

        if (dto.EnrollAllActive)
        {
            employeesToEnroll = await _db.Employees
                .Where(e => e.IsActive && !alreadyEnrolledEmployeeIds.Contains(e.Id))
                .ToListAsync();
        }
        else if (!string.IsNullOrWhiteSpace(dto.TargetGroup))
        {
            employeesToEnroll = await _db.Employees
                .Where(e => e.IsActive && e.ReportingGroup == dto.TargetGroup && !alreadyEnrolledEmployeeIds.Contains(e.Id))
                .ToListAsync();
        }
        else if (!string.IsNullOrWhiteSpace(dto.SapId) || dto.EmployeeId.HasValue)
        {
            var emp = dto.EmployeeId.HasValue
                ? await _db.Employees.FindAsync(dto.EmployeeId.Value)
                : await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.SapId!.Trim());

            if (emp == null)
            {
                return NotFound(new { message = "Specified employee could not be found." });
            }

            if (alreadyEnrolledEmployeeIds.Contains(emp.Id))
            {
                return BadRequest(new { message = $"Employee '{emp.FullName}' (SAP ID: {emp.SapId}) is already enrolled in this cycle." });
            }

            employeesToEnroll.Add(emp);
        }
        else
        {
            return BadRequest(new { message = "Please specify an employee SAP ID, target group, or select 'Enroll All Active Staff'." });
        }

        int enrolledCount = 0;
        foreach (var emp in employeesToEnroll)
        {
            // Snapshot attributes: allow override for single enrollment, or default to current employee master data
            string snapshotGrade = emp.Grade;
            if (!string.IsNullOrWhiteSpace(dto.OverrideGrade))
            {
                var matched = await _db.GradeMappings.FirstOrDefaultAsync(g => g.EsgCode == dto.OverrideGrade.Trim() || g.GradeName == dto.OverrideGrade.Trim() || g.GradeCode == dto.OverrideGrade.Trim());
                snapshotGrade = matched?.EsgCode ?? dto.OverrideGrade.Trim();
            }

            string snapshotGroup = emp.ReportingGroup;
            if (!string.IsNullOrWhiteSpace(dto.OverrideReportingGroup))
            {
                var matched = await _db.ReportingGroups.FirstOrDefaultAsync(g => g.RpsaCode == dto.OverrideReportingGroup.Trim() || g.GroupName == dto.OverrideReportingGroup.Trim() || g.GroupCode == dto.OverrideReportingGroup.Trim());
                snapshotGroup = matched?.RpsaCode ?? dto.OverrideReportingGroup.Trim();
            }

            string snapshotDesignation = dto.OverrideDesignation?.Trim() ?? emp.Designation;
            string snapshotDivision = emp.Division;
            string snapshotWing = emp.WingDepartment;
            string snapshotRegion = emp.RegionBranch;
            string snapshotLocation = dto.OverrideLocation?.Trim() ?? emp.Location;
            bool snapshotMrt = dto.OverrideIsMrtOrMrc ?? emp.IsMrtOrMrc;

            // Form Type determination based on snapshot grade and MRT policy
            var assignedFormType = EmployeeImportService.DetermineFormType(snapshotGrade, snapshotMrt);

            Guid? firstAppraiserId = emp.FirstAppraiserId;
            if (!string.IsNullOrWhiteSpace(dto.OverrideFirstAppraiserSapId))
            {
                var fa = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.OverrideFirstAppraiserSapId.Trim());
                if (fa != null) firstAppraiserId = fa.Id;
            }

            Guid? secondAppraiserId = emp.SecondAppraiserId;
            if (!string.IsNullOrWhiteSpace(dto.OverrideSecondAppraiserSapId))
            {
                var sa = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.OverrideSecondAppraiserSapId.Trim());
                if (sa != null) secondAppraiserId = sa.Id;
            }

            var empCycle = new EmployeeCycle
            {
                EmployeeId = emp.Id,
                CycleId = cycleId,
                AssignedFormType = assignedFormType,
                CurrentStatus = WorkflowStatus.ObjectiveDraft,
                SnapshotGrade = snapshotGrade,
                SnapshotDesignation = snapshotDesignation,
                SnapshotReportingGroup = snapshotGroup,
                SnapshotDivision = snapshotDivision,
                SnapshotWingDepartment = snapshotWing,
                SnapshotRegionBranch = snapshotRegion,
                SnapshotLocation = snapshotLocation,
                SnapshotIsMrtOrMrc = snapshotMrt,
                FirstAppraiserId = firstAppraiserId,
                SecondAppraiserId = secondAppraiserId,
                AppraiserValidationStatus = "Validated",
                CreatedAt = DateTime.UtcNow
            };

            _db.EmployeeCycles.Add(empCycle);
            enrolledCount++;
        }

        await _db.SaveChangesAsync();

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_STAFF_ENROLLED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(AppraisalCycle),
            TargetEntityId = cycle.Id.ToString(),
            ActionDescription = $"Enrolled {enrolledCount} employees into cycle '{cycle.Title}' with frozen historical grade/group snapshots.",
            Timestamp = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"Successfully enrolled {enrolledCount} employees into cycle '{cycle.Title}'.",
            enrolledCount
        });
    }

    /// <summary>
    /// Updates the frozen cycle historical snapshot attributes for an enrolled employee in a specific appraisal cycle.
    /// </summary>
    [HttpPut("{cycleId}/employees/{employeeCycleId}/snapshot")]
    public async Task<IActionResult> UpdateCycleEmployeeSnapshot(
        Guid cycleId,
        Guid employeeCycleId,
        [FromBody] UpdateCycleEmployeeSnapshotDto dto)
    {
        var empCycle = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .FirstOrDefaultAsync(ec => ec.Id == employeeCycleId && ec.CycleId == cycleId);

        if (empCycle == null)
        {
            return NotFound(new { message = "Employee cycle record not found." });
        }

        if (!string.IsNullOrWhiteSpace(dto.SnapshotGrade))
        {
            var matched = await _db.GradeMappings.FirstOrDefaultAsync(g => g.EsgCode == dto.SnapshotGrade.Trim() || g.GradeName == dto.SnapshotGrade.Trim() || g.GradeCode == dto.SnapshotGrade.Trim());
            empCycle.SnapshotGrade = matched?.EsgCode ?? dto.SnapshotGrade.Trim();
        }

        if (!string.IsNullOrWhiteSpace(dto.SnapshotReportingGroup))
        {
            var matched = await _db.ReportingGroups.FirstOrDefaultAsync(g => g.RpsaCode == dto.SnapshotReportingGroup.Trim() || g.GroupName == dto.SnapshotReportingGroup.Trim() || g.GroupCode == dto.SnapshotReportingGroup.Trim());
            empCycle.SnapshotReportingGroup = matched?.RpsaCode ?? dto.SnapshotReportingGroup.Trim();
        }

        if (!string.IsNullOrWhiteSpace(dto.SnapshotDesignation))
            empCycle.SnapshotDesignation = dto.SnapshotDesignation.Trim();

        if (!string.IsNullOrWhiteSpace(dto.SnapshotLocation))
            empCycle.SnapshotLocation = dto.SnapshotLocation.Trim();

        if (!string.IsNullOrWhiteSpace(dto.SnapshotRegionBranch))
            empCycle.SnapshotRegionBranch = dto.SnapshotRegionBranch.Trim();

        if (dto.SnapshotIsMrtOrMrc.HasValue)
            empCycle.SnapshotIsMrtOrMrc = dto.SnapshotIsMrtOrMrc.Value;

        if (!string.IsNullOrWhiteSpace(dto.FirstAppraiserSapId))
        {
            var fa = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.FirstAppraiserSapId.Trim());
            if (fa != null) empCycle.FirstAppraiserId = fa.Id;
        }

        if (!string.IsNullOrWhiteSpace(dto.SecondAppraiserSapId))
        {
            var sa = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.SecondAppraiserSapId.Trim());
            if (sa != null) empCycle.SecondAppraiserId = sa.Id;
        }

        // Recalculate Assigned Form Type based on updated snapshot grade / MRT
        string effectiveGrade = empCycle.SnapshotGrade ?? empCycle.Employee!.Grade;
        bool effectiveMrt = empCycle.SnapshotIsMrtOrMrc ?? empCycle.Employee!.IsMrtOrMrc;
        empCycle.AssignedFormType = EmployeeImportService.DetermineFormType(effectiveGrade, effectiveMrt);
        empCycle.UpdatedAt = DateTime.UtcNow;

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_EMPLOYEE_SNAPSHOT_UPDATED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(EmployeeCycle),
            TargetEntityId = employeeCycleId.ToString(),
            ActionDescription = $"Updated Cycle Snapshot for {empCycle.Employee!.FullName} (Grade: {empCycle.SnapshotGrade}, Group: {empCycle.SnapshotReportingGroup}, Form: {empCycle.AssignedFormType}).",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Cycle snapshot parameters updated successfully.",
            empCycle.Id,
            empCycle.SnapshotGrade,
            empCycle.SnapshotReportingGroup,
            empCycle.SnapshotDesignation,
            AssignedFormType = empCycle.AssignedFormType.ToString()
        });
    }

    /// <summary>
    /// Removes (un-enrolls) an employee from a specific appraisal cycle.
    /// </summary>
    [HttpDelete("{cycleId}/employees/{employeeCycleId}")]
    public async Task<IActionResult> RemoveEmployeeFromCycle(
        Guid cycleId,
        Guid employeeCycleId,
        [FromQuery] string? actorUserId)
    {
        var empCycle = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Include(ec => ec.Cycle)
            .FirstOrDefaultAsync(ec => ec.Id == employeeCycleId && ec.CycleId == cycleId);

        if (empCycle == null)
        {
            return NotFound(new { message = "Employee cycle record not found." });
        }

        // Clean up child draft objectives, traits, development reviews, and disagreements
        var objectives = await _db.Objectives.Where(o => o.EmployeeCycleId == employeeCycleId).ToListAsync();
        _db.Objectives.RemoveRange(objectives);

        var traits = await _db.BehaviourTraits.Where(t => t.EmployeeCycleId == employeeCycleId).ToListAsync();
        _db.BehaviourTraits.RemoveRange(traits);

        var devReviews = await _db.DevelopmentReviews.Where(dr => dr.EmployeeCycleId == employeeCycleId).ToListAsync();
        _db.DevelopmentReviews.RemoveRange(devReviews);

        var disagreements = await _db.DisagreementCases.Where(d => d.EmployeeCycleId == employeeCycleId).ToListAsync();
        _db.DisagreementCases.RemoveRange(disagreements);

        _db.EmployeeCycles.Remove(empCycle);

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_EMPLOYEE_REMOVED",
            ActorUserId = actorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(EmployeeCycle),
            TargetEntityId = employeeCycleId.ToString(),
            ActionDescription = $"Removed Employee '{empCycle.Employee?.FullName}' (SAP ID: {empCycle.Employee?.SapId}) from Cycle '{empCycle.Cycle?.Title}'.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"Employee '{empCycle.Employee?.FullName}' un-enrolled from '{empCycle.Cycle?.Title}' successfully."
        });
    }

    #endregion
}

public record CreateCycleDto(
    string Title,
    string? CircularReference,
    DateTime? StartDate,
    DateTime? EndDate,
    DateTime? AcknowledgementDeadline,
    bool MultipleActiveCyclesAllowed = true,
    string? ActorUserId = "PMW_ADMIN"
);

public record EnrollCycleEmployeesDto(
    string? SapId,
    Guid? EmployeeId,
    string? TargetGroup,
    bool EnrollAllActive = false,
    string? OverrideGrade = null,
    string? OverrideReportingGroup = null,
    string? OverrideDesignation = null,
    string? OverrideLocation = null,
    bool? OverrideIsMrtOrMrc = null,
    string? OverrideFirstAppraiserSapId = null,
    string? OverrideSecondAppraiserSapId = null,
    string? ActorUserId = "PMW_ADMIN"
);

public record UpdateCycleEmployeeSnapshotDto(
    string? SnapshotGrade,
    string? SnapshotReportingGroup,
    string? SnapshotDesignation,
    string? SnapshotLocation,
    string? SnapshotRegionBranch,
    bool? SnapshotIsMrtOrMrc,
    string? FirstAppraiserSapId,
    string? SecondAppraiserSapId,
    string? ActorUserId = "PMW_ADMIN"
);
