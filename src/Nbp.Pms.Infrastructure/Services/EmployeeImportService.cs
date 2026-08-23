using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Infrastructure.Services;

public record EmployeeImportRowDto(
    string SapId,
    string FullName,
    string Grade,
    string Designation,
    string Location,
    string ReportingGroup,
    string Division,
    string WingDepartment,
    string RegionBranch,
    string? FirstAppraiserSapId,
    string? SecondAppraiserSapId,
    bool IsMrtOrMrc
);

public record ImportResultDto(
    int TotalProcessed,
    int SuccessfulImports,
    int ErrorCount,
    List<string> ValidationErrors,
    List<Employee> ImportedEmployees
);

public class EmployeeImportService
{
    private readonly PmsDbContext _db;

    private static readonly HashSet<string> VpAndAboveGrades = new(StringComparer.OrdinalIgnoreCase)
    {
        "VP", "SVP", "EVP", "SEVP", "PRESIDENT", "CEO", "PRESIDENT/CEO"
    };

    public EmployeeImportService(PmsDbContext db)
    {
        _db = db;
    }

    public async Task<ImportResultDto> ProcessImportAsync(List<EmployeeImportRowDto> rows, Guid? targetCycleId = null, string actorUserId = "PMW_ADMIN")
    {
        var errors = new List<string>();
        var importedList = new List<Employee>();
        var employeeMap = new Dictionary<string, Employee>();

        // 1. Process Employee records
        for (int i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            int rowNum = i + 1;

            if (string.IsNullOrWhiteSpace(row.SapId))
            {
                errors.Add($"Row {rowNum}: Missing SAP ID.");
                continue;
            }

            if (string.IsNullOrWhiteSpace(row.FullName))
            {
                errors.Add($"Row {rowNum} (SAP {row.SapId}): Missing Full Name.");
                continue;
            }

            if (string.IsNullOrWhiteSpace(row.Grade))
            {
                errors.Add($"Row {rowNum} (SAP {row.SapId}): Missing Grade.");
                continue;
            }

            // Check if employee already exists in DB
            var existing = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == row.SapId.Trim());
            Employee emp;

            if (existing != null)
            {
                emp = existing;
                emp.FullName = row.FullName.Trim();
                emp.Grade = row.Grade.Trim();
                emp.Designation = row.Designation?.Trim() ?? "Officer";
                emp.Location = row.Location?.Trim() ?? "Head Office";
                emp.ReportingGroup = row.ReportingGroup?.Trim() ?? "General Banking";
                emp.Division = row.Division?.Trim() ?? "Operations";
                emp.WingDepartment = row.WingDepartment?.Trim() ?? "General";
                emp.RegionBranch = row.RegionBranch?.Trim() ?? "Karachi Main";
                emp.IsMrtOrMrc = row.IsMrtOrMrc;
                emp.Email = $"{row.SapId.Trim()}@nbp.com.pk";
            }
            else
            {
                emp = new Employee
                {
                    Id = Guid.NewGuid(),
                    SapId = row.SapId.Trim(),
                    FullName = row.FullName.Trim(),
                    Grade = row.Grade.Trim(),
                    Designation = row.Designation?.Trim() ?? "Officer",
                    Location = row.Location?.Trim() ?? "Head Office",
                    ReportingGroup = row.ReportingGroup?.Trim() ?? "General Banking",
                    Division = row.Division?.Trim() ?? "Operations",
                    WingDepartment = row.WingDepartment?.Trim() ?? "General",
                    RegionBranch = row.RegionBranch?.Trim() ?? "Karachi Main",
                    IsMrtOrMrc = row.IsMrtOrMrc,
                    Email = $"{row.SapId.Trim()}@nbp.com.pk"
                };
                _db.Employees.Add(emp);
            }

            employeeMap[emp.SapId] = emp;
            importedList.Add(emp);
        }

        // 2. Link Appraiser SAP IDs
        foreach (var row in rows)
        {
            if (!employeeMap.TryGetValue(row.SapId, out var emp)) continue;

            if (!string.IsNullOrWhiteSpace(row.FirstAppraiserSapId))
            {
                var fa = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == row.FirstAppraiserSapId.Trim())
                         ?? (employeeMap.TryGetValue(row.FirstAppraiserSapId.Trim(), out var localFa) ? localFa : null);

                if (fa != null)
                {
                    if (fa.SapId == emp.SapId)
                    {
                        errors.Add($"SAP ID {emp.SapId}: Cannot assign self as First Appraiser.");
                    }
                    else
                    {
                        emp.FirstAppraiserId = fa.Id;
                    }
                }
            }

            if (!string.IsNullOrWhiteSpace(row.SecondAppraiserSapId))
            {
                var sa = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == row.SecondAppraiserSapId.Trim())
                         ?? (employeeMap.TryGetValue(row.SecondAppraiserSapId.Trim(), out var localSa) ? localSa : null);

                if (sa != null)
                {
                    emp.SecondAppraiserId = sa.Id;
                }
            }
        }

        // Save employees to Database
        await _db.SaveChangesAsync();

        // 3. Resolve target appraisal cycle to enroll employees with historical frozen snapshot
        AppraisalCycle? cycle = null;
        if (targetCycleId.HasValue)
        {
            cycle = await _db.AppraisalCycles.FindAsync(targetCycleId.Value);
        }

        if (cycle == null)
        {
            cycle = await _db.AppraisalCycles.FirstOrDefaultAsync(c => c.Status == WorkflowStatus.CycleActive)
                    ?? await _db.AppraisalCycles.OrderByDescending(c => c.CreatedAt).FirstOrDefaultAsync();
        }

        if (cycle == null)
        {
            cycle = new AppraisalCycle
            {
                Title = $"Annual Performance Appraisal Cycle {DateTime.UtcNow.Year}",
                CircularReference = $"NBP/HR/{DateTime.UtcNow.Year}/001",
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddYears(1),
                AcknowledgementDeadline = DateTime.UtcNow.AddMonths(11),
                Status = WorkflowStatus.CycleActive
            };
            _db.AppraisalCycles.Add(cycle);
            await _db.SaveChangesAsync();
        }

        foreach (var row in rows)
        {
            if (!employeeMap.TryGetValue(row.SapId, out var emp)) continue;

            var empCycle = await _db.EmployeeCycles
                .FirstOrDefaultAsync(ec => ec.CycleId == cycle.Id && ec.EmployeeId == emp.Id);

            var formType = DetermineFormType(row.Grade, row.IsMrtOrMrc);

            if (empCycle == null)
            {
                empCycle = new EmployeeCycle
                {
                    EmployeeId = emp.Id,
                    CycleId = cycle.Id,
                    AssignedFormType = formType,
                    CurrentStatus = WorkflowStatus.ObjectiveDraft,
                    SnapshotGrade = row.Grade.Trim(),
                    SnapshotDesignation = row.Designation?.Trim() ?? emp.Designation,
                    SnapshotReportingGroup = row.ReportingGroup?.Trim() ?? emp.ReportingGroup,
                    SnapshotDivision = row.Division?.Trim() ?? emp.Division,
                    SnapshotWingDepartment = row.WingDepartment?.Trim() ?? emp.WingDepartment,
                    SnapshotRegionBranch = row.RegionBranch?.Trim() ?? emp.RegionBranch,
                    SnapshotLocation = row.Location?.Trim() ?? emp.Location,
                    SnapshotIsMrtOrMrc = row.IsMrtOrMrc,
                    FirstAppraiserId = emp.FirstAppraiserId,
                    SecondAppraiserId = emp.SecondAppraiserId,
                    AppraiserValidationStatus = "Validated",
                    CreatedAt = DateTime.UtcNow
                };
                _db.EmployeeCycles.Add(empCycle);
            }
            else
            {
                // Update snapshot values for this specific cycle
                empCycle.SnapshotGrade = row.Grade.Trim();
                empCycle.SnapshotDesignation = row.Designation?.Trim() ?? emp.Designation;
                empCycle.SnapshotReportingGroup = row.ReportingGroup?.Trim() ?? emp.ReportingGroup;
                empCycle.SnapshotDivision = row.Division?.Trim() ?? emp.Division;
                empCycle.SnapshotWingDepartment = row.WingDepartment?.Trim() ?? emp.WingDepartment;
                empCycle.SnapshotRegionBranch = row.RegionBranch?.Trim() ?? emp.RegionBranch;
                empCycle.SnapshotLocation = row.Location?.Trim() ?? emp.Location;
                empCycle.SnapshotIsMrtOrMrc = row.IsMrtOrMrc;
                empCycle.AssignedFormType = formType;
                if (emp.FirstAppraiserId.HasValue) empCycle.FirstAppraiserId = emp.FirstAppraiserId;
                if (emp.SecondAppraiserId.HasValue) empCycle.SecondAppraiserId = emp.SecondAppraiserId;
                empCycle.UpdatedAt = DateTime.UtcNow;
            }
        }

        // Log Audit Event
        var audit = new AuditEvent
        {
            EventType = "BULK_EMPLOYEE_IMPORT_EXECUTED",
            ActorUserId = actorUserId,
            ActorRole = "PmwAdmin",
            ActionDescription = $"Bulk import uploaded {importedList.Count} employee records into Cycle '{cycle.Title}' with frozen historical snapshot attributes.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();

        return new ImportResultDto(
            TotalProcessed: rows.Count,
            SuccessfulImports: importedList.Count,
            ErrorCount: errors.Count,
            ValidationErrors: errors,
            ImportedEmployees: importedList
        );
    }

    public static FormType DetermineFormType(string grade, bool isMrtOrMrc)
    {
        if (isMrtOrMrc) return FormType.RiskAdjustedBsc;

        string normalizedGrade = grade.Trim().ToUpperInvariant();
        if (VpAndAboveGrades.Contains(normalizedGrade))
        {
            return FormType.BalancedScorecard;
        }

        return FormType.KpiForm;
    }
}
