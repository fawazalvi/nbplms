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

    /// <summary>
    /// Gets detailed analytics, form breakdowns, stage progress, and audit logs for a specific appraisal cycle control center.
    /// </summary>
    [HttpGet("{id}/stats")]
    public async Task<IActionResult> GetCycleStats(Guid id)
    {
        var cycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Id == id);
        if (cycle == null) return NotFound(new { message = "Cycle not found." });

        var employeeCycles = await _db.EmployeeCycles
            .Where(ec => ec.CycleId == id)
            .Include(ec => ec.Employee)
            .ToListAsync();

        var totalEnrolled = employeeCycles.Count;
        var kpiCount = employeeCycles.Count(ec => ec.AssignedFormType == FormType.KpiForm);
        var bscCount = employeeCycles.Count(ec => ec.AssignedFormType == FormType.BalancedScorecard);
        var riskBscCount = employeeCycles.Count(ec => ec.AssignedFormType == FormType.RiskAdjustedBsc);

        var objectiveDraftCount = employeeCycles.Count(ec => ec.CurrentStatus == WorkflowStatus.ObjectiveDraft);
        var objectiveSubmittedCount = employeeCycles.Count(ec => ec.CurrentStatus == WorkflowStatus.ObjectiveSubmitted);
        var objectiveApprovedCount = employeeCycles.Count(ec => ec.CurrentStatus == WorkflowStatus.ObjectiveApproved);
        var annualReviewCount = employeeCycles.Count(ec => ec.CurrentStatus == WorkflowStatus.AnnualReviewSelfAssessment || ec.CurrentStatus == WorkflowStatus.FirstAppraiserAssessment || ec.CurrentStatus == WorkflowStatus.SecondAppraiserReview);
        var completedCount = employeeCycles.Count(ec => ec.CurrentStatus == WorkflowStatus.CycleClosed || ec.CurrentStatus == WorkflowStatus.Published || ec.CurrentStatus == WorkflowStatus.AdministrativelyCompleted || ec.CurrentStatus == WorkflowStatus.EmployeeAgreed);
        var disagreementCount = employeeCycles.Count(ec => ec.CurrentStatus == WorkflowStatus.EmployeeDisagreed);

        var groups = await _db.ReportingGroups.ToListAsync();
        var groupMap = groups.ToDictionary(g => g.RpsaCode ?? g.GroupCode, g => g.GroupName);

        var groupBreakdown = employeeCycles
            .GroupBy(ec => ec.SnapshotReportingGroup ?? "0001")
            .Select(g => new
            {
                GroupCode = g.Key,
                GroupName = groupMap.TryGetValue(g.Key, out var name) ? name : g.Key,
                Count = g.Count(),
                CompletedCount = g.Count(ec => ec.CurrentStatus == WorkflowStatus.CycleClosed || ec.CurrentStatus == WorkflowStatus.Published || ec.CurrentStatus == WorkflowStatus.AdministrativelyCompleted || ec.CurrentStatus == WorkflowStatus.EmployeeAgreed),
                DraftCount = g.Count(ec => ec.CurrentStatus == WorkflowStatus.ObjectiveDraft)
            })
            .OrderByDescending(g => g.Count)
            .ToList();

        var recentAudits = await _db.AuditEvents
            .Where(a => a.TargetEntityId == id.ToString() || (a.ActionDescription != null && a.ActionDescription.Contains(cycle.Title)))
            .OrderByDescending(a => a.Timestamp)
            .Take(8)
            .ToListAsync();

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
            TotalEnrolled = totalEnrolled,
            FormBreakdown = new
            {
                Kpi = kpiCount,
                Bsc = bscCount,
                RiskBsc = riskBscCount
            },
            StageBreakdown = new
            {
                ObjectiveDraft = objectiveDraftCount,
                ObjectiveSubmitted = objectiveSubmittedCount,
                ObjectiveApproved = objectiveApprovedCount,
                AnnualReview = annualReviewCount,
                Completed = completedCount,
                Disagreement = disagreementCount
            },
            GroupBreakdown = groupBreakdown,
            RecentAudits = recentAudits
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
                Id = ec.Id,
                EmployeeCycleId = ec.Id,
                ec.EmployeeId,
                Employee = new
                {
                    ec.Employee!.Id,
                    ec.Employee.SapId,
                    ec.Employee.FullName,
                    ec.Employee.Email,
                    ec.Employee.Grade,
                    ec.Employee.ReportingGroup,
                    ec.Employee.Designation,
                    ec.Employee.Location,
                    ec.Employee.RegionBranch,
                    ec.Employee.IsMrtOrMrc
                },
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
                FirstAppraiser = ec.FirstAppraiser != null
                    ? new { ec.FirstAppraiser.Id, ec.FirstAppraiser.SapId, ec.FirstAppraiser.FullName }
                    : ec.Employee!.FirstAppraiser != null
                        ? new { ec.Employee!.FirstAppraiser.Id, ec.Employee!.FirstAppraiser.SapId, ec.Employee!.FirstAppraiser.FullName }
                        : null,
                FirstAppraiserSapId = ec.FirstAppraiser != null ? ec.FirstAppraiser.SapId : ec.Employee!.FirstAppraiser != null ? ec.Employee!.FirstAppraiser.SapId : null,
                FirstAppraiserName = ec.FirstAppraiser != null ? ec.FirstAppraiser.FullName : ec.Employee!.FirstAppraiser != null ? ec.Employee!.FirstAppraiser.FullName : null,

                SecondAppraiserId = ec.SecondAppraiserId,
                SecondAppraiser = ec.SecondAppraiser != null
                    ? new { ec.SecondAppraiser.Id, ec.SecondAppraiser.SapId, ec.SecondAppraiser.FullName }
                    : ec.Employee!.SecondAppraiser != null
                        ? new { ec.Employee!.SecondAppraiser.Id, ec.Employee!.SecondAppraiser.SapId, ec.Employee!.SecondAppraiser.FullName }
                        : null,
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
    [HttpPut("{cycleId}/employees/{employeeCycleId}")]
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

        // Recalculate or override Assigned Form Type based on updated snapshot grade / MRT / explicit DTO
        string effectiveGrade = empCycle.SnapshotGrade ?? empCycle.Employee!.Grade;
        bool effectiveMrt = empCycle.SnapshotIsMrtOrMrc ?? empCycle.Employee!.IsMrtOrMrc;

        if (!string.IsNullOrWhiteSpace(dto.AssignedFormType))
        {
            empCycle.AssignedFormType = ParseFormType(dto.AssignedFormType, effectiveGrade, effectiveMrt);
        }
        else
        {
            empCycle.AssignedFormType = EmployeeImportService.DetermineFormType(effectiveGrade, effectiveMrt);
        }

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

    #region Appraisal Cycle Snapshots (Groups, Grades & Employees)

    /// <summary>
    /// Explicit on-demand snapshot of Reporting Groups and Grades hierarchy for an appraisal cycle.
    /// Deduplicates by RPSA code and ESG code (Upsert logic).
    /// </summary>
    [HttpPost("{id}/snapshot/organization")]
    public async Task<IActionResult> SnapshotOrganization(Guid id, [FromQuery] string? actorUserId = "PMW_ADMIN")
    {
        var cycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Id == id);
        if (cycle == null) return NotFound(new { message = "Cycle not found." });

        var masterGroups = await _db.ReportingGroups.Where(g => g.IsActive).ToListAsync();
        var masterGrades = await _db.GradeMappings.Where(g => g.IsActive).ToListAsync();

        var existingSnapshotGroups = await _db.CycleReportingGroups.Where(g => g.CycleId == id).ToListAsync();
        var existingSnapshotGrades = await _db.CycleGradeMappings.Where(g => g.CycleId == id).ToListAsync();

        var snapshottedAt = DateTime.UtcNow;
        var groupsUpdated = 0;
        var groupsAdded = 0;
        var gradesUpdated = 0;
        var gradesAdded = 0;

        // Snapshot Reporting Groups with strict RPSA code deduplication
        foreach (var mg in masterGroups)
        {
            var rpsa = mg.RpsaCode ?? mg.GroupCode;
            var snapGroup = existingSnapshotGroups.FirstOrDefault(g => g.RpsaCode == rpsa);
            if (snapGroup != null)
            {
                snapGroup.GroupCode = mg.GroupCode;
                snapGroup.GroupName = mg.GroupName;
                snapGroup.HeadOfGroupSapId = mg.HeadOfGroupSapId;
                snapGroup.UpdatedAt = snapshottedAt;
                snapGroup.UpdatedBy = actorUserId;
                groupsUpdated++;
            }
            else
            {
                _db.CycleReportingGroups.Add(new CycleReportingGroup
                {
                    CycleId = id,
                    RpsaCode = rpsa,
                    GroupCode = mg.GroupCode,
                    GroupName = mg.GroupName,
                    HeadOfGroupSapId = mg.HeadOfGroupSapId,
                    SnapshottedAt = snapshottedAt,
                    SnapshottedBy = actorUserId ?? "PMW_ADMIN"
                });
                groupsAdded++;
            }
        }

        // Snapshot Grade Mappings with strict ESG code deduplication
        foreach (var mg in masterGrades)
        {
            var esg = mg.EsgCode ?? mg.GradeCode;
            var snapGrade = existingSnapshotGrades.FirstOrDefault(g => g.EsgCode == esg);
            if (snapGrade != null)
            {
                snapGrade.GradeCode = mg.GradeCode;
                snapGrade.GradeName = mg.GradeName;
                snapGrade.HierarchyOrder = mg.RankOrder;
                snapGrade.DefaultFormType = mg.DefaultFormType;
                snapGrade.UpdatedAt = snapshottedAt;
                snapGrade.UpdatedBy = actorUserId;
                gradesUpdated++;
            }
            else
            {
                _db.CycleGradeMappings.Add(new CycleGradeMapping
                {
                    CycleId = id,
                    EsgCode = esg,
                    GradeCode = mg.GradeCode,
                    GradeName = mg.GradeName,
                    HierarchyOrder = mg.RankOrder,
                    DefaultFormType = mg.DefaultFormType,
                    SnapshottedAt = snapshottedAt,
                    SnapshottedBy = actorUserId ?? "PMW_ADMIN"
                });
                gradesAdded++;
            }
        }

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_ORGANIZATION_SNAPSHOTTED",
            ActorUserId = actorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(AppraisalCycle),
            TargetEntityId = id.ToString(),
            ActionDescription = $"Captured organizational snapshot for Cycle '{cycle.Title}': {groupsAdded + groupsUpdated} Reporting Groups, {gradesAdded + gradesUpdated} Grade Mappings.",
            Timestamp = snapshottedAt
        });

        await _db.SaveChangesAsync();

        var totalGroups = await _db.CycleReportingGroups.CountAsync(g => g.CycleId == id);
        var totalGrades = await _db.CycleGradeMappings.CountAsync(g => g.CycleId == id);

        return Ok(new
        {
            message = $"Organizational hierarchy snapshot captured successfully for '{cycle.Title}'.",
            groupsCount = totalGroups,
            gradesCount = totalGrades,
            groupsAdded,
            groupsUpdated,
            gradesAdded,
            gradesUpdated,
            snapshottedAt
        });
    }

    /// <summary>
    /// Selectively snapshots master reporting groups and/or grades into a specific appraisal cycle.
    /// Supports selecting specific RPSA codes, ESG codes, or snapping all groups/grades with clean upsert.
    /// </summary>
    [HttpPost("{id}/snapshot/selective-org")]
    public async Task<IActionResult> SnapshotSelectiveOrg(Guid id, [FromBody] SnapshotSelectiveOrgDto dto)
    {
        var cycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Id == id);
        if (cycle == null) return NotFound(new { message = "Appraisal cycle not found." });

        var snapshottedAt = DateTime.UtcNow;
        var actorUserId = dto.ActorUserId ?? "PMW_ADMIN";

        int groupsAdded = 0;
        int groupsUpdated = 0;
        int gradesAdded = 0;
        int gradesUpdated = 0;

        // 1. Process Master Reporting Groups Selection
        if (dto.SnapshotAllGroups || (dto.RpsaCodes != null && dto.RpsaCodes.Any()))
        {
            var masterGroupsQuery = _db.ReportingGroups.Where(rg => rg.IsActive != false);
            if (!dto.SnapshotAllGroups && dto.RpsaCodes != null)
            {
                var rpsaSet = dto.RpsaCodes.Select(r => r.Trim().PadLeft(4, '0')).ToHashSet();
                var rawCodeSet = dto.RpsaCodes.Select(r => r.Trim()).ToHashSet();
                masterGroupsQuery = masterGroupsQuery.Where(rg => rpsaSet.Contains(rg.RpsaCode) || rawCodeSet.Contains(rg.GroupCode));
            }
            var masterGroups = await masterGroupsQuery.ToListAsync();

            var existingCycleGroups = await _db.CycleReportingGroups.Where(g => g.CycleId == id).ToListAsync();

            foreach (var mg in masterGroups)
            {
                string rpsa = !string.IsNullOrWhiteSpace(mg.RpsaCode) ? mg.RpsaCode.PadLeft(4, '0') : "0000";
                var snapGroup = existingCycleGroups.FirstOrDefault(g => g.RpsaCode == rpsa || g.GroupCode == mg.GroupCode);
                if (snapGroup != null)
                {
                    snapGroup.GroupName = mg.GroupName;
                    snapGroup.HeadOfGroupSapId = mg.HeadOfGroupSapId;
                    snapGroup.UpdatedAt = snapshottedAt;
                    snapGroup.UpdatedBy = actorUserId;
                    groupsUpdated++;
                }
                else
                {
                    _db.CycleReportingGroups.Add(new CycleReportingGroup
                    {
                        CycleId = id,
                        RpsaCode = rpsa,
                        GroupCode = mg.GroupCode,
                        GroupName = mg.GroupName,
                        HeadOfGroupSapId = mg.HeadOfGroupSapId,
                        SnapshottedAt = snapshottedAt,
                        SnapshottedBy = actorUserId
                    });
                    groupsAdded++;
                }
            }
        }

        // 2. Process Master ESG Grades Selection
        if (dto.SnapshotAllGrades || (dto.EsgCodes != null && dto.EsgCodes.Any()))
        {
            var masterGradesQuery = _db.GradeMappings.Where(g => g.IsActive);
            if (!dto.SnapshotAllGrades && dto.EsgCodes != null)
            {
                var esgSet = dto.EsgCodes.Select(e => e.Trim().PadLeft(2, '0')).ToHashSet();
                var rawGradeSet = dto.EsgCodes.Select(e => e.Trim()).ToHashSet();
                masterGradesQuery = masterGradesQuery.Where(g => esgSet.Contains(g.EsgCode) || rawGradeSet.Contains(g.GradeCode));
            }
            var masterGrades = await masterGradesQuery.OrderBy(g => g.RankOrder).ToListAsync();

            var existingCycleGrades = await _db.CycleGradeMappings.Where(g => g.CycleId == id).ToListAsync();

            foreach (var mg in masterGrades)
            {
                string esg = !string.IsNullOrWhiteSpace(mg.EsgCode) ? mg.EsgCode.PadLeft(2, '0') : mg.RankOrder.ToString("D2");
                var snapGrade = existingCycleGrades.FirstOrDefault(g => g.EsgCode == esg || g.GradeCode == mg.GradeCode);
                if (snapGrade != null)
                {
                    snapGrade.GradeCode = mg.GradeCode;
                    snapGrade.GradeName = mg.GradeName;
                    snapGrade.HierarchyOrder = mg.RankOrder;
                    snapGrade.DefaultFormType = mg.DefaultFormType;
                    snapGrade.UpdatedAt = snapshottedAt;
                    snapGrade.UpdatedBy = actorUserId;
                    gradesUpdated++;
                }
                else
                {
                    _db.CycleGradeMappings.Add(new CycleGradeMapping
                    {
                        CycleId = id,
                        EsgCode = esg,
                        GradeCode = mg.GradeCode,
                        GradeName = mg.GradeName,
                        HierarchyOrder = mg.RankOrder,
                        DefaultFormType = mg.DefaultFormType,
                        SnapshottedAt = snapshottedAt,
                        SnapshottedBy = actorUserId
                    });
                    gradesAdded++;
                }
            }
        }

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_SELECTIVE_ORGANIZATION_SNAPSHOTTED",
            ActorUserId = actorUserId,
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(AppraisalCycle),
            TargetEntityId = id.ToString(),
            ActionDescription = $"Selectively snapshotted organizational hierarchy for Cycle '{cycle.Title}': {groupsAdded + groupsUpdated} Groups, {gradesAdded + gradesUpdated} Grades.",
            Timestamp = snapshottedAt
        });

        await _db.SaveChangesAsync();

        var totalGroups = await _db.CycleReportingGroups.CountAsync(g => g.CycleId == id);
        var totalGrades = await _db.CycleGradeMappings.CountAsync(g => g.CycleId == id);

        return Ok(new
        {
            message = $"Successfully snapshotted {groupsAdded + groupsUpdated} group(s) and {gradesAdded + gradesUpdated} grade(s) into '{cycle.Title}'.",
            groupsCount = totalGroups,
            gradesCount = totalGrades,
            groupsAdded,
            groupsUpdated,
            gradesAdded,
            gradesUpdated,
            snapshottedAt
        });
    }

    /// <summary>
    /// Explicit on-demand employee snapshot for a cycle. Supports bank-wide or group-wise snapshot by RPSA code.
    /// Strict SAP ID deduplication ensures repeated snapshots cleanly update rather than duplicate.
    /// </summary>
    [HttpPost("{id}/snapshot/employees")]
    public async Task<IActionResult> SnapshotEmployees(Guid id, [FromBody] SnapshotCycleEmployeesDto dto)
    {
        var cycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Id == id);
        if (cycle == null) return NotFound(new { message = "Cycle not found." });

        var snapGrades = await _db.CycleGradeMappings.Where(g => g.CycleId == id).ToListAsync();
        var snapGroups = await _db.CycleReportingGroups.Where(g => g.CycleId == id).ToListAsync();

        var empQuery = _db.Employees
            .Include(e => e.FirstAppraiser)
            .Include(e => e.SecondAppraiser)
            .Where(e => e.IsActive);

        if (!string.IsNullOrWhiteSpace(dto.RpsaCode) && dto.RpsaCode != "ALL")
        {
            empQuery = empQuery.Where(e => e.ReportingGroup == dto.RpsaCode.Trim());
        }

        var sourceEmployees = await empQuery.ToListAsync();
        if (sourceEmployees.Count == 0)
        {
            return Ok(new
            {
                message = "No active employees found matching the specified group filter to snapshot.",
                snapshottedCount = 0,
                totalEnrolled = await _db.EmployeeCycles.CountAsync(ec => ec.CycleId == id)
            });
        }

        var existingEmployeeCycles = await _db.EmployeeCycles
            .Where(ec => ec.CycleId == id)
            .ToListAsync();

        var snapshottedAt = DateTime.UtcNow;
        var addedCount = 0;
        var updatedCount = 0;

        foreach (var emp in sourceEmployees)
        {
            // Determine Form Type based on snapshotted grade rules & MRT flag
            FormType formType = FormType.KpiForm;
            if (emp.IsMrtOrMrc)
            {
                formType = FormType.RiskAdjustedBsc;
            }
            else
            {
                var gradeMatch = snapGrades.FirstOrDefault(g => g.EsgCode == emp.Grade);
                if (gradeMatch != null)
                {
                    formType = gradeMatch.DefaultFormType == "BALANCED_SCORECARD" || gradeMatch.DefaultFormType == "RISK_ADJUSTED_BSC"
                        ? FormType.BalancedScorecard
                        : FormType.KpiForm;
                }
                else
                {
                    // Default fallback by ESG code band (01-05 = VP & Above => BSC; 06-09 = AVP & Below => KPI)
                    formType = (emp.Grade == "01" || emp.Grade == "02" || emp.Grade == "03" || emp.Grade == "04" || emp.Grade == "05")
                        ? FormType.BalancedScorecard
                        : FormType.KpiForm;
                }
            }

            var existingEc = existingEmployeeCycles.FirstOrDefault(ec => ec.EmployeeId == emp.Id);
            if (existingEc != null)
            {
                // Clean Upsert: Update existing snapshot fields without creating duplicates
                existingEc.SnapshotGrade = emp.Grade;
                existingEc.SnapshotReportingGroup = emp.ReportingGroup;
                existingEc.SnapshotDesignation = emp.Designation;
                existingEc.SnapshotLocation = emp.Location;
                existingEc.SnapshotIsMrtOrMrc = emp.IsMrtOrMrc;
                existingEc.FirstAppraiserId = emp.FirstAppraiserId;
                existingEc.SecondAppraiserId = emp.SecondAppraiserId;
                existingEc.AssignedFormType = formType;
                existingEc.UpdatedAt = snapshottedAt;
                updatedCount++;
            }
            else
            {
                // Insert fresh employee cycle record
                _db.EmployeeCycles.Add(new EmployeeCycle
                {
                    CycleId = id,
                    EmployeeId = emp.Id,
                    CurrentStatus = WorkflowStatus.ObjectiveDraft,
                    AssignedFormType = formType,
                    SnapshotGrade = emp.Grade,
                    SnapshotReportingGroup = emp.ReportingGroup,
                    SnapshotDesignation = emp.Designation,
                    SnapshotLocation = emp.Location,
                    SnapshotIsMrtOrMrc = emp.IsMrtOrMrc,
                    FirstAppraiserId = emp.FirstAppraiserId,
                    SecondAppraiserId = emp.SecondAppraiserId,
                    CreatedAt = snapshottedAt
                });
                addedCount++;
            }
        }

        var groupDesc = !string.IsNullOrWhiteSpace(dto.RpsaCode) && dto.RpsaCode != "ALL"
            ? $"for Group (RPSA: {dto.RpsaCode})"
            : "Bank-wide";

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_EMPLOYEES_SNAPSHOTTED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(AppraisalCycle),
            TargetEntityId = id.ToString(),
            ActionDescription = $"Captured employee snapshot {groupDesc} for Cycle '{cycle.Title}': {addedCount} newly enrolled, {updatedCount} updated.",
            Timestamp = snapshottedAt
        });

        await _db.SaveChangesAsync();

        var totalEnrolled = await _db.EmployeeCycles.CountAsync(ec => ec.CycleId == id);

        return Ok(new
        {
            message = $"Employee snapshot {groupDesc} captured successfully for '{cycle.Title}'.",
            addedCount,
            updatedCount,
            totalEnrolled,
            snapshottedAt
        });
    }

    /// <summary>
    /// Gets summary of all snapshots taken for a cycle.
    /// </summary>
    [HttpGet("{id}/snapshot/summary")]
    public async Task<IActionResult> GetSnapshotSummary(Guid id)
    {
        var cycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Id == id);
        if (cycle == null) return NotFound(new { message = "Cycle not found." });

        var groups = await _db.CycleReportingGroups.Where(g => g.CycleId == id).ToListAsync();
        var grades = await _db.CycleGradeMappings.Where(g => g.CycleId == id).OrderBy(g => g.HierarchyOrder).ToListAsync();
        var enrolledEmployees = await _db.EmployeeCycles.Where(ec => ec.CycleId == id).ToListAsync();

        var lastOrgAudit = await _db.AuditEvents
            .Where(a => a.TargetEntityId == id.ToString() && a.EventType == "CYCLE_ORGANIZATION_SNAPSHOTTED")
            .OrderByDescending(a => a.Timestamp)
            .FirstOrDefaultAsync();

        var lastEmpAudit = await _db.AuditEvents
            .Where(a => a.TargetEntityId == id.ToString() && a.EventType == "CYCLE_EMPLOYEES_SNAPSHOTTED")
            .OrderByDescending(a => a.Timestamp)
            .FirstOrDefaultAsync();

        var groupBreakdown = groups.Select(g => new
        {
            g.Id,
            g.RpsaCode,
            g.GroupCode,
            g.GroupName,
            g.HeadOfGroupSapId,
            EnrolledCount = enrolledEmployees.Count(ec => ec.SnapshotReportingGroup == g.RpsaCode)
        }).ToList();

        return Ok(new
        {
            cycleId = id,
            cycleTitle = cycle.Title,
            hasOrgSnapshot = groups.Count > 0 && grades.Count > 0,
            groupsCount = groups.Count,
            gradesCount = grades.Count,
            employeesCount = enrolledEmployees.Count,
            lastOrgSnapshotAt = lastOrgAudit?.Timestamp ?? groups.FirstOrDefault()?.SnapshottedAt,
            lastEmployeeSnapshotAt = lastEmpAudit?.Timestamp,
            groups = groupBreakdown,
            grades = grades.Select(g => new
            {
                g.Id,
                g.EsgCode,
                g.GradeCode,
                g.GradeName,
                g.HierarchyOrder,
                g.DefaultFormType
            })
        });
    }

    /// <summary>
    /// Gets frozen reporting groups for a cycle.
    /// </summary>
    [HttpGet("{id}/snapshot/groups")]
    public async Task<IActionResult> GetSnapshotGroups(Guid id)
    {
        var groups = await _db.CycleReportingGroups
            .Where(g => g.CycleId == id)
            .OrderBy(g => g.RpsaCode)
            .ToListAsync();
        return Ok(groups);
    }

    /// <summary>
    /// Allows PMW Admin to fine-tune a snapshot reporting group for this cycle without mutating master data.
    /// </summary>
    [HttpPut("{id}/snapshot/groups/{groupId}")]
    public async Task<IActionResult> UpdateSnapshotGroup(Guid id, Guid groupId, [FromBody] UpdateSnapshotGroupDto dto)
    {
        var snapGroup = await _db.CycleReportingGroups.FirstOrDefaultAsync(g => g.CycleId == id && g.Id == groupId);
        if (snapGroup == null) return NotFound(new { message = "Snapshot group not found for this cycle." });

        snapGroup.GroupName = dto.GroupName.Trim();
        snapGroup.HeadOfGroupSapId = dto.HeadOfGroupSapId?.Trim();
        snapGroup.UpdatedAt = DateTime.UtcNow;
        snapGroup.UpdatedBy = dto.ActorUserId ?? "PMW_ADMIN";

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_SNAPSHOT_GROUP_UPDATED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(CycleReportingGroup),
            TargetEntityId = groupId.ToString(),
            ActionDescription = $"Updated Cycle Snapshot Group '{snapGroup.GroupCode}' (RPSA: {snapGroup.RpsaCode}) in Cycle {id}.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(snapGroup);
    }

    /// <summary>
    /// Gets frozen grades for a cycle.
    /// </summary>
    [HttpGet("{id}/snapshot/grades")]
    public async Task<IActionResult> GetSnapshotGrades(Guid id)
    {
        var grades = await _db.CycleGradeMappings
            .Where(g => g.CycleId == id)
            .OrderBy(g => g.HierarchyOrder)
            .ToListAsync();
        return Ok(grades);
    }

    /// <summary>
    /// Allows PMW Admin to fine-tune a snapshot grade mapping for this cycle without mutating master data.
    /// </summary>
    [HttpPut("{id}/snapshot/grades/{gradeId}")]
    public async Task<IActionResult> UpdateSnapshotGrade(Guid id, Guid gradeId, [FromBody] UpdateSnapshotGradeDto dto)
    {
        var snapGrade = await _db.CycleGradeMappings.FirstOrDefaultAsync(g => g.CycleId == id && g.Id == gradeId);
        if (snapGrade == null) return NotFound(new { message = "Snapshot grade not found for this cycle." });

        snapGrade.GradeName = dto.GradeName.Trim();
        snapGrade.DefaultFormType = dto.DefaultFormType.Trim();
        snapGrade.UpdatedAt = DateTime.UtcNow;
        snapGrade.UpdatedBy = dto.ActorUserId ?? "PMW_ADMIN";

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_SNAPSHOT_GRADE_UPDATED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(CycleGradeMapping),
            TargetEntityId = gradeId.ToString(),
            ActionDescription = $"Updated Cycle Snapshot Grade '{snapGrade.GradeCode}' (ESG: {snapGrade.EsgCode}) in Cycle {id}.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(snapGrade);
    }

    /// <summary>
    /// Bulk unassigns / removes enrolled employees from a specific appraisal cycle.
    /// Supports either a list of specific EmployeeCycle IDs or criteria filters (RpsaCode, EsgCode, FormType, SearchTerm).
    /// </summary>
    [HttpPost("{id}/employees/bulk-unassign")]
    public async Task<IActionResult> BulkUnassignEmployees(Guid id, [FromBody] BulkUnassignEmployeesDto dto)
    {
        var cycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Id == id);
        if (cycle == null) return NotFound(new { message = "Appraisal cycle not found." });

        var query = _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Where(ec => ec.CycleId == id);

        if (dto.EmployeeCycleIds != null && dto.EmployeeCycleIds.Any())
        {
            query = query.Where(ec => dto.EmployeeCycleIds.Contains(ec.Id));
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(dto.RpsaCode) && dto.RpsaCode != "ALL")
            {
                query = query.Where(ec => ec.SnapshotReportingGroup == dto.RpsaCode || (ec.Employee != null && ec.Employee.ReportingGroup == dto.RpsaCode));
            }
            if (!string.IsNullOrWhiteSpace(dto.EsgCode) && dto.EsgCode != "ALL")
            {
                query = query.Where(ec => ec.SnapshotGrade == dto.EsgCode || (ec.Employee != null && ec.Employee.Grade == dto.EsgCode));
            }
            if (!string.IsNullOrWhiteSpace(dto.FormType) && dto.FormType != "ALL")
            {
                var parsedFormType = ParseFormType(dto.FormType, "OG I", false);
                query = query.Where(ec => ec.AssignedFormType == parsedFormType);
            }
            if (!string.IsNullOrWhiteSpace(dto.SearchTerm))
            {
                var term = dto.SearchTerm.Trim().ToLower();
                query = query.Where(ec => ec.Employee != null && (
                    ec.Employee.SapId.ToLower().Contains(term) ||
                    ec.Employee.FullName.ToLower().Contains(term) ||
                    ec.Employee.Designation.ToLower().Contains(term)
                ));
            }
        }

        var targets = await query.ToListAsync();
        if (!targets.Any())
        {
            return Ok(new { message = "No matching employees found to unassign.", unassignedCount = 0 });
        }

        var targetIds = targets.Select(t => t.Id).ToList();

        // Clean up child draft records safely
        var objectives = await _db.Objectives.Where(o => targetIds.Contains(o.EmployeeCycleId)).ToListAsync();
        _db.Objectives.RemoveRange(objectives);

        var traits = await _db.BehaviourTraits.Where(t => targetIds.Contains(t.EmployeeCycleId)).ToListAsync();
        _db.BehaviourTraits.RemoveRange(traits);

        var devReviews = await _db.DevelopmentReviews.Where(dr => targetIds.Contains(dr.EmployeeCycleId)).ToListAsync();
        _db.DevelopmentReviews.RemoveRange(devReviews);

        var disagreements = await _db.DisagreementCases.Where(d => targetIds.Contains(d.EmployeeCycleId)).ToListAsync();
        _db.DisagreementCases.RemoveRange(disagreements);

        _db.EmployeeCycles.RemoveRange(targets);

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_EMPLOYEES_BULK_UNASSIGNED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(EmployeeCycle),
            TargetEntityId = id.ToString(),
            ActionDescription = $"Bulk unassigned {targets.Count} employees from Cycle '{cycle.Title}'.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"Successfully unassigned {targets.Count} employees from '{cycle.Title}'.",
            unassignedCount = targets.Count
        });
    }

    /// <summary>
    /// Bulk overrides assigned form type (KPI 70/30, BSC, Risk BSC) for selected employees in a cycle.
    /// </summary>
    [HttpPost("{id}/employees/bulk-override-form-type")]
    public async Task<IActionResult> BulkOverrideFormType(Guid id, [FromBody] BulkOverrideFormTypeDto dto)
    {
        string normalizedFormStr = (dto.FormType ?? "").Replace("_", "").ToLower();
        FormType newFormType;
        if (normalizedFormStr.Contains("risk")) newFormType = FormType.RiskAdjustedBsc;
        else if (normalizedFormStr.Contains("scorecard") || normalizedFormStr.Contains("bsc")) newFormType = FormType.BalancedScorecard;
        else newFormType = FormType.KpiForm;

        var empCycles = await _db.EmployeeCycles
            .Where(ec => ec.CycleId == id && dto.EmployeeCycleIds.Contains(ec.Id))
            .ToListAsync();

        foreach (var ec in empCycles)
        {
            ec.AssignedFormType = newFormType;
            ec.UpdatedAt = DateTime.UtcNow;
        }

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_EMPLOYEES_FORM_TYPE_OVERRIDDEN",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(EmployeeCycle),
            TargetEntityId = id.ToString(),
            ActionDescription = $"Bulk changed form type to '{newFormType}' for {empCycles.Count} employees in Cycle {id}.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"Updated form type to '{newFormType}' for {empCycles.Count} employees.",
            updatedCount = empCycles.Count
        });
    }

    /// <summary>
    /// Bulk assigns First and/or Second Appraisers for selected employees in a cycle.
    /// </summary>
    [HttpPost("{id}/employees/bulk-assign-appraisers")]
    public async Task<IActionResult> BulkAssignAppraisers(Guid id, [FromBody] BulkAssignAppraisersDto dto)
    {
        if (dto.EmployeeCycleIds == null || !dto.EmployeeCycleIds.Any())
        {
            return BadRequest(new { message = "At least one employee must be selected." });
        }

        Guid? firstAppraiserId = null;
        if (!string.IsNullOrWhiteSpace(dto.FirstAppraiserSapId))
        {
            var fa = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.FirstAppraiserSapId.Trim());
            if (fa != null) firstAppraiserId = fa.Id;
        }

        Guid? secondAppraiserId = null;
        if (!string.IsNullOrWhiteSpace(dto.SecondAppraiserSapId))
        {
            var sa = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.SecondAppraiserSapId.Trim());
            if (sa != null) secondAppraiserId = sa.Id;
        }

        var empCycles = await _db.EmployeeCycles
            .Include(ec => ec.Employee)
            .Where(ec => ec.CycleId == id && dto.EmployeeCycleIds.Contains(ec.Id))
            .ToListAsync();

        foreach (var ec in empCycles)
        {
            if (firstAppraiserId.HasValue) ec.FirstAppraiserId = firstAppraiserId.Value;
            if (secondAppraiserId.HasValue) ec.SecondAppraiserId = secondAppraiserId.Value;
            ec.UpdatedAt = DateTime.UtcNow;
        }

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_EMPLOYEES_APPRAISERS_BULK_ASSIGNED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(EmployeeCycle),
            TargetEntityId = id.ToString(),
            ActionDescription = $"Bulk assigned Appraisers (FA SAP: {dto.FirstAppraiserSapId}, SA SAP: {dto.SecondAppraiserSapId}) for {empCycles.Count} employees in Cycle {id}.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"Successfully assigned appraisers for {empCycles.Count} employees.",
            updatedCount = empCycles.Count
        });
    }

    /// <summary>
    /// Snapshots active employees belonging to multiple selected reporting groups (by RPSA codes).
    /// </summary>
    private static FormType ParseFormType(string? formTypeStr, string? grade, bool isMrt)
    {
        if (string.IsNullOrWhiteSpace(formTypeStr))
            return EmployeeImportService.DetermineFormType(grade ?? "OG I", isMrt);

        var clean = formTypeStr.Trim().Replace("_", "").Replace("-", "").Replace(" ", "");
        if (clean.Equals("KpiForm", StringComparison.OrdinalIgnoreCase) || clean.Equals("Kpi", StringComparison.OrdinalIgnoreCase))
            return FormType.KpiForm;
        if (clean.Equals("BalancedScorecard", StringComparison.OrdinalIgnoreCase) || clean.Equals("BscForm", StringComparison.OrdinalIgnoreCase) || clean.Equals("Bsc", StringComparison.OrdinalIgnoreCase))
            return isMrt ? FormType.RiskAdjustedBsc : FormType.BalancedScorecard;
        if (clean.Equals("RiskAdjustedBsc", StringComparison.OrdinalIgnoreCase) || clean.Equals("RiskBsc", StringComparison.OrdinalIgnoreCase))
            return FormType.RiskAdjustedBsc;

        if (Enum.TryParse<FormType>(clean, true, out var result))
            return result;

        return EmployeeImportService.DetermineFormType(grade ?? "OG I", isMrt);
    }

    /// <summary>
    /// Snapshots active employees belonging to multiple selected reporting groups (by RPSA codes, group codes, or group names).
    /// </summary>
    [HttpPost("{id}/snapshot/employees-multi-group")]
    public async Task<IActionResult> SnapshotMultiGroupEmployees(Guid id, [FromBody] SnapshotMultiGroupEmployeesDto dto)
    {
        var cycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Id == id);
        if (cycle == null) return NotFound(new { message = "Appraisal cycle not found." });

        var snapshottedAt = DateTime.UtcNow;
        var rpsaCodes = dto.RpsaCodes?.Where(c => !string.IsNullOrWhiteSpace(c)).Select(c => c.Trim()).ToList() ?? new List<string>();

        // Build exhaustive match set for reporting groups (0001, 1, CBG, Commercial Banking Group, etc.)
        var masterGroups = await _db.ReportingGroups.Where(rg => rg.IsActive != false).ToListAsync();
        var targetIdentifiers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var code in rpsaCodes)
        {
            if (string.IsNullOrWhiteSpace(code)) continue;
            targetIdentifiers.Add(code.Trim());
            targetIdentifiers.Add(code.Trim().PadLeft(4, '0'));
            targetIdentifiers.Add(code.Trim().TrimStart('0'));
        }

        foreach (var mg in masterGroups)
        {
            bool isMatch = targetIdentifiers.Contains(mg.RpsaCode) ||
                           targetIdentifiers.Contains(mg.GroupCode) ||
                           targetIdentifiers.Contains(mg.GroupName) ||
                           targetIdentifiers.Contains(mg.RpsaCode.TrimStart('0')) ||
                           targetIdentifiers.Contains(mg.RpsaCode.PadLeft(4, '0'));
            if (isMatch)
            {
                if (!string.IsNullOrWhiteSpace(mg.RpsaCode))
                {
                    targetIdentifiers.Add(mg.RpsaCode);
                    targetIdentifiers.Add(mg.RpsaCode.TrimStart('0'));
                    targetIdentifiers.Add(mg.RpsaCode.PadLeft(4, '0'));
                }
                if (!string.IsNullOrWhiteSpace(mg.GroupCode)) targetIdentifiers.Add(mg.GroupCode);
                if (!string.IsNullOrWhiteSpace(mg.GroupName)) targetIdentifiers.Add(mg.GroupName);
            }
        }

        var allActiveEmployees = await _db.Employees.Where(e => e.IsActive).ToListAsync();
        var masterEmployees = targetIdentifiers.Contains("ALL") || !rpsaCodes.Any()
            ? allActiveEmployees
            : allActiveEmployees.Where(e => !string.IsNullOrWhiteSpace(e.ReportingGroup) &&
                                           (targetIdentifiers.Contains(e.ReportingGroup) ||
                                            targetIdentifiers.Contains(e.ReportingGroup.PadLeft(4, '0')) ||
                                            targetIdentifiers.Contains(e.ReportingGroup.TrimStart('0')))).ToList();

        var existingEnrollments = await _db.EmployeeCycles.Where(ec => ec.CycleId == id).ToListAsync();
        var cycleGrades = await _db.CycleGradeMappings.Where(g => g.CycleId == id).ToListAsync();

        // Also ensure matched groups are frozen into CycleReportingGroups
        var existingCycleGroups = await _db.CycleReportingGroups.Where(g => g.CycleId == id).ToListAsync();
        foreach (var mg in masterGroups.Where(g => targetIdentifiers.Contains(g.RpsaCode) || targetIdentifiers.Contains(g.GroupCode) || targetIdentifiers.Contains(g.GroupName)))
        {
            string rpsa = !string.IsNullOrWhiteSpace(mg.RpsaCode) ? mg.RpsaCode.PadLeft(4, '0') : "0000";
            if (!existingCycleGroups.Any(g => g.RpsaCode == rpsa || g.GroupCode == mg.GroupCode))
            {
                _db.CycleReportingGroups.Add(new CycleReportingGroup
                {
                    CycleId = id,
                    RpsaCode = rpsa,
                    GroupCode = mg.GroupCode,
                    GroupName = mg.GroupName,
                    HeadOfGroupSapId = mg.HeadOfGroupSapId,
                    SnapshottedAt = snapshottedAt,
                    SnapshottedBy = dto.ActorUserId ?? "PMW_ADMIN"
                });
            }
        }

        int addedCount = 0;
        int updatedCount = 0;

        foreach (var emp in masterEmployees)
        {
            var matchedCycleGrade = cycleGrades.FirstOrDefault(g => g.EsgCode == emp.Grade || g.GradeCode == emp.Grade);
            var formType = ParseFormType(matchedCycleGrade?.DefaultFormType, emp.Grade, emp.IsMrtOrMrc);

            var existing = existingEnrollments.FirstOrDefault(ec => ec.EmployeeId == emp.Id);
            if (existing != null)
            {
                existing.SnapshotGrade = emp.Grade;
                existing.SnapshotReportingGroup = emp.ReportingGroup;
                existing.SnapshotDesignation = emp.Designation;
                existing.SnapshotLocation = emp.Location;
                existing.SnapshotIsMrtOrMrc = emp.IsMrtOrMrc;
                existing.AssignedFormType = formType;
                existing.UpdatedAt = snapshottedAt;
                updatedCount++;
            }
            else
            {
                _db.EmployeeCycles.Add(new EmployeeCycle
                {
                    CycleId = id,
                    EmployeeId = emp.Id,
                    CurrentStatus = WorkflowStatus.ObjectiveDraft,
                    AssignedFormType = formType,
                    SnapshotGrade = emp.Grade,
                    SnapshotReportingGroup = emp.ReportingGroup,
                    SnapshotDesignation = emp.Designation,
                    SnapshotLocation = emp.Location,
                    SnapshotIsMrtOrMrc = emp.IsMrtOrMrc,
                    FirstAppraiserId = emp.FirstAppraiserId,
                    SecondAppraiserId = emp.SecondAppraiserId,
                    CreatedAt = snapshottedAt
                });
                addedCount++;
            }
        }

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_MULTI_GROUP_EMPLOYEES_SNAPSHOTTED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(AppraisalCycle),
            TargetEntityId = id.ToString(),
            ActionDescription = $"Snapshotted employees for Groups [{string.Join(", ", rpsaCodes)}] ({addedCount} added, {updatedCount} updated) in '{cycle.Title}'.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        var totalEnrolled = await _db.EmployeeCycles.CountAsync(ec => ec.CycleId == id);
        return Ok(new
        {
            message = $"Snapshot completed: {addedCount} added, {updatedCount} updated across {rpsaCodes.Count} reporting group(s).",
            addedCount,
            updatedCount,
            totalEnrolled,
            snapshottedAt
        });
    }

    /// <summary>
    /// Creates a new snapshot reporting group directly in this cycle.
    /// </summary>
    [HttpPost("{id}/snapshot/groups")]
    public async Task<IActionResult> CreateSnapshotGroup(Guid id, [FromBody] CreateCycleSnapshotGroupDto dto)
    {
        var cycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Id == id);
        if (cycle == null) return NotFound(new { message = "Appraisal cycle not found." });

        var rpsa = dto.RpsaCode?.Trim() ?? "0000";
        var existing = await _db.CycleReportingGroups.FirstOrDefaultAsync(g => g.CycleId == id && g.RpsaCode == rpsa);
        if (existing != null)
        {
            return BadRequest(new { message = $"Snapshot reporting group with RPSA Code '{rpsa}' already exists for this cycle." });
        }

        var snapGroup = new CycleReportingGroup
        {
            CycleId = id,
            RpsaCode = rpsa,
            GroupCode = dto.GroupCode.Trim().ToUpper(),
            GroupName = dto.GroupName.Trim(),
            HeadOfGroupSapId = dto.HeadOfGroupSapId?.Trim(),
            SnapshottedAt = DateTime.UtcNow,
            SnapshottedBy = dto.ActorUserId ?? "PMW_ADMIN"
        };

        _db.CycleReportingGroups.Add(snapGroup);

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_SNAPSHOT_GROUP_CREATED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(CycleReportingGroup),
            TargetEntityId = snapGroup.Id.ToString(),
            ActionDescription = $"Created new Snapshot Group '{snapGroup.GroupName}' (RPSA: {snapGroup.RpsaCode}) in Cycle '{cycle.Title}'.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(snapGroup);
    }

    /// <summary>
    /// Removes a snapshot reporting group from this cycle.
    /// </summary>
    [HttpDelete("{id}/snapshot/groups/{groupId}")]
    public async Task<IActionResult> DeleteSnapshotGroup(Guid id, Guid groupId, [FromQuery] string? actorUserId)
    {
        var group = await _db.CycleReportingGroups.FirstOrDefaultAsync(g => g.CycleId == id && g.Id == groupId);
        if (group == null) return NotFound(new { message = "Snapshot group not found." });

        _db.CycleReportingGroups.Remove(group);

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_SNAPSHOT_GROUP_DELETED",
            ActorUserId = actorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(CycleReportingGroup),
            TargetEntityId = groupId.ToString(),
            ActionDescription = $"Deleted Snapshot Group '{group.GroupName}' (RPSA: {group.RpsaCode}) from Cycle {id}.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Snapshot group '{group.GroupName}' removed successfully." });
    }

    /// <summary>
    /// Creates a new snapshot grade directly in this cycle.
    /// </summary>
    [HttpPost("{id}/snapshot/grades")]
    public async Task<IActionResult> CreateSnapshotGrade(Guid id, [FromBody] CreateCycleSnapshotGradeDto dto)
    {
        var cycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Id == id);
        if (cycle == null) return NotFound(new { message = "Appraisal cycle not found." });

        var esg = dto.EsgCode?.Trim() ?? "00";
        var existing = await _db.CycleGradeMappings.FirstOrDefaultAsync(g => g.CycleId == id && g.EsgCode == esg);
        if (existing != null)
        {
            return BadRequest(new { message = $"Snapshot grade with ESG Code '{esg}' already exists for this cycle." });
        }

        var snapGrade = new CycleGradeMapping
        {
            CycleId = id,
            EsgCode = esg,
            GradeCode = dto.GradeCode.Trim().ToUpper(),
            GradeName = dto.GradeName.Trim(),
            HierarchyOrder = dto.HierarchyOrder,
            DefaultFormType = dto.DefaultFormType.Trim(),
            SnapshottedAt = DateTime.UtcNow,
            SnapshottedBy = dto.ActorUserId ?? "PMW_ADMIN"
        };

        _db.CycleGradeMappings.Add(snapGrade);

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_SNAPSHOT_GRADE_CREATED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(CycleGradeMapping),
            TargetEntityId = snapGrade.Id.ToString(),
            ActionDescription = $"Created new Snapshot Grade '{snapGrade.GradeName}' (ESG: {snapGrade.EsgCode}) in Cycle '{cycle.Title}'.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(snapGrade);
    }

    /// <summary>
    /// Removes a snapshot grade from this cycle.
    /// </summary>
    [HttpDelete("{id}/snapshot/grades/{gradeId}")]
    public async Task<IActionResult> DeleteSnapshotGrade(Guid id, Guid gradeId, [FromQuery] string? actorUserId)
    {
        var grade = await _db.CycleGradeMappings.FirstOrDefaultAsync(g => g.CycleId == id && g.Id == gradeId);
        if (grade == null) return NotFound(new { message = "Snapshot grade not found." });

        _db.CycleGradeMappings.Remove(grade);

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "CYCLE_SNAPSHOT_GRADE_DELETED",
            ActorUserId = actorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(CycleGradeMapping),
            TargetEntityId = gradeId.ToString(),
            ActionDescription = $"Deleted Snapshot Grade '{grade.GradeName}' (ESG: {grade.EsgCode}) from Cycle {id}.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Snapshot grade '{grade.GradeName}' removed successfully." });
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
    string? AssignedFormType = null,
    string? ActorUserId = "PMW_ADMIN"
);

public record SnapshotCycleEmployeesDto(
    string? RpsaCode = null,
    string? ActorUserId = "PMW_ADMIN"
);

public record SnapshotMultiGroupEmployeesDto(
    List<string> RpsaCodes,
    string? ActorUserId = "PMW_ADMIN"
);

public record BulkUnassignEmployeesDto(
    List<Guid>? EmployeeCycleIds = null,
    string? RpsaCode = null,
    string? EsgCode = null,
    string? FormType = null,
    string? SearchTerm = null,
    string? ActorUserId = "PMW_ADMIN"
);

public record BulkOverrideFormTypeDto(
    List<Guid> EmployeeCycleIds,
    string FormType,
    string? ActorUserId = "PMW_ADMIN"
);

public record BulkAssignAppraisersDto(
    List<Guid> EmployeeCycleIds,
    string? FirstAppraiserSapId,
    string? SecondAppraiserSapId,
    string? ActorUserId = "PMW_ADMIN"
);

public record CreateCycleSnapshotGroupDto(
    string RpsaCode,
    string GroupCode,
    string GroupName,
    string? HeadOfGroupSapId,
    string? ActorUserId = "PMW_ADMIN"
);

public record UpdateSnapshotGroupDto(
    string GroupName,
    string? HeadOfGroupSapId,
    string? ActorUserId = "PMW_ADMIN"
);

public record CreateCycleSnapshotGradeDto(
    string EsgCode,
    string GradeCode,
    string GradeName,
    int HierarchyOrder,
    string DefaultFormType,
    string? ActorUserId = "PMW_ADMIN"
);

public record UpdateSnapshotGradeDto(
    string GradeName,
    string DefaultFormType,
    string? ActorUserId = "PMW_ADMIN"
);

public record SnapshotSelectiveOrgDto(
    List<string>? RpsaCodes,
    List<string>? EsgCodes,
    bool SnapshotAllGroups = false,
    bool SnapshotAllGrades = false,
    string? ActorUserId = "PMW_ADMIN"
);
