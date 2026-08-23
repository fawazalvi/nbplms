using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Infrastructure.Services;

public record EmployeeImportRowDto(
    string SapId,
    string FullName,
    string? EsgCode,
    string? Designation,
    string? Location,
    string? RpsaCode,
    string? Division,
    string? WingDepartment,
    string? RegionBranch,
    string? FirstAppraiserSapId,
    string? SecondAppraiserSapId,
    bool IsMrtOrMrc = false,
    string? Grade = null,
    string? ReportingGroup = null
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

    private static string? FormatEsg(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        string digits = new string(code.Where(char.IsDigit).ToArray());
        if (int.TryParse(digits, out int num))
        {
            return num.ToString("D2");
        }
        return code.Trim();
    }

    private static string? FormatRpsa(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        string digits = new string(code.Where(char.IsDigit).ToArray());
        if (int.TryParse(digits, out int num))
        {
            return num.ToString("D4");
        }
        return code.Trim();
    }

    public async Task<ImportResultDto> ProcessImportAsync(List<EmployeeImportRowDto> rows, Guid? targetCycleId = null, string actorUserId = "PMW_ADMIN")
    {
        var errors = new List<string>();
        var importedList = new List<Employee>();
        var employeeMap = new Dictionary<string, Employee>();

        // Load valid master data for strict code verification
        var gradeMappings = await _db.GradeMappings.ToListAsync();
        var reportingGroups = await _db.ReportingGroups.ToListAsync();

        var validEsgList = string.Join(", ", gradeMappings.OrderBy(g => g.RankOrder).Select(g => $"{g.EsgCode} ({g.GradeName})"));
        var validRpsaList = string.Join(", ", reportingGroups.OrderBy(g => g.RpsaCode).Select(g => $"{g.RpsaCode} ({g.GroupName})"));

        // 1. Process and strictly validate Employee records
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

            // Strictly validate Grade via ESG code (Free text is strictly disallowed)
            string? rawEsg = !string.IsNullOrWhiteSpace(row.EsgCode) ? row.EsgCode : row.Grade;
            if (string.IsNullOrWhiteSpace(rawEsg))
            {
                errors.Add($"Row {rowNum} (SAP {row.SapId}): Missing Grade ESG code. Free text is not allowed. Available ESG codes: {validEsgList}");
                continue;
            }

            string? formattedEsg = FormatEsg(rawEsg);
            var matchedGrade = gradeMappings.FirstOrDefault(g => 
                (formattedEsg != null && g.EsgCode == formattedEsg) ||
                string.Equals(g.GradeCode, rawEsg.Trim(), StringComparison.OrdinalIgnoreCase));

            if (matchedGrade == null)
            {
                errors.Add($"Row {rowNum} (SAP {row.SapId}): Invalid Grade ESG code '{rawEsg}'. Free text is strictly not allowed. Must provide a valid 2-digit ESG code: {validEsgList}");
                continue;
            }

            // Strictly validate Reporting Group via RPSA code (Free text is strictly disallowed)
            string? rawRpsa = !string.IsNullOrWhiteSpace(row.RpsaCode) ? row.RpsaCode : row.ReportingGroup;
            if (string.IsNullOrWhiteSpace(rawRpsa))
            {
                errors.Add($"Row {rowNum} (SAP {row.SapId}): Missing Reporting Group RPSA code. Free text is not allowed. Available RPSA codes: {validRpsaList}");
                continue;
            }

            string? formattedRpsa = FormatRpsa(rawRpsa);
            var matchedGroup = reportingGroups.FirstOrDefault(rg => 
                (formattedRpsa != null && rg.RpsaCode == formattedRpsa) ||
                string.Equals(rg.GroupCode, rawRpsa.Trim(), StringComparison.OrdinalIgnoreCase));

            if (matchedGroup == null)
            {
                errors.Add($"Row {rowNum} (SAP {row.SapId}): Invalid Reporting Group RPSA code '{rawRpsa}'. Free text is strictly not allowed. Must provide a valid 4-digit RPSA code: {validRpsaList}");
                continue;
            }

            // Check if employee already exists in DB
            var existing = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == row.SapId.Trim());
            Employee emp;

            if (existing != null)
            {
                emp = existing;
                emp.FullName = row.FullName.Trim();
                emp.Grade = matchedGrade.GradeName;
                emp.Designation = row.Designation?.Trim() ?? "Officer";
                emp.Location = row.Location?.Trim() ?? "Head Office";
                emp.ReportingGroup = matchedGroup.GroupName;
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
                    Grade = matchedGrade.GradeName,
                    Designation = row.Designation?.Trim() ?? "Officer",
                    Location = row.Location?.Trim() ?? "Head Office",
                    ReportingGroup = matchedGroup.GroupName,
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

        if (importedList.Count == 0 && errors.Count > 0)
        {
            return new ImportResultDto(
                TotalProcessed: rows.Count,
                SuccessfulImports: 0,
                ErrorCount: errors.Count,
                ValidationErrors: errors,
                ImportedEmployees: importedList
            );
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

            var matchedGrade = gradeMappings.FirstOrDefault(g => g.GradeName == emp.Grade);
            var formType = row.IsMrtOrMrc
                ? FormType.RiskAdjustedBsc
                : (matchedGrade?.DefaultFormType == "BALANCED_SCORECARD" || VpAndAboveGrades.Contains(emp.Grade)
                    ? FormType.BalancedScorecard
                    : FormType.KpiForm);

            if (empCycle == null)
            {
                empCycle = new EmployeeCycle
                {
                    EmployeeId = emp.Id,
                    CycleId = cycle.Id,
                    AssignedFormType = formType,
                    CurrentStatus = WorkflowStatus.ObjectiveDraft,
                    SnapshotGrade = emp.Grade,
                    SnapshotDesignation = row.Designation?.Trim() ?? emp.Designation,
                    SnapshotReportingGroup = emp.ReportingGroup,
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
                empCycle.SnapshotGrade = emp.Grade;
                empCycle.SnapshotDesignation = row.Designation?.Trim() ?? emp.Designation;
                empCycle.SnapshotReportingGroup = emp.ReportingGroup;
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
            ActionDescription = $"Bulk import uploaded {importedList.Count} employee records into Cycle '{cycle.Title}' with strict ESG ({validEsgList}) and RPSA ({validRpsaList}) validation.",
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
