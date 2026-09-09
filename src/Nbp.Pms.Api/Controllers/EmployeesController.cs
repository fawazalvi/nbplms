using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;
using Nbp.Pms.Infrastructure.Services;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly PmsDbContext _db;
    private readonly EmployeeImportService _importService;

    public EmployeesController(PmsDbContext db, EmployeeImportService importService)
    {
        _db = db;
        _importService = importService;
    }

    [HttpGet]
    public async Task<IActionResult> GetEmployees([FromQuery] string? group, [FromQuery] string? grade, [FromQuery] string? search)
    {
        var query = _db.Employees
            .Include(e => e.FirstAppraiser)
            .Include(e => e.SecondAppraiser)
            .Include(e => e.CoAppraiser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(group) && group != "All Groups")
        {
            query = query.Where(e => e.ReportingGroup == group);
        }

        if (!string.IsNullOrWhiteSpace(grade) && grade != "All Grades")
        {
            query = query.Where(e => e.Grade == grade);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(e => e.FullName.Contains(search) || e.SapId.Contains(search) || (e.Email != null && e.Email.Contains(search)));
        }

        var employees = await query.OrderBy(e => e.SapId).Select(e => new
        {
            e.Id,
            e.SapId,
            e.FullName,
            e.Grade,
            e.Designation,
            e.Location,
            e.ReportingGroup,
            e.Division,
            e.WingDepartment,
            e.RegionBranch,
            e.IsMrtOrMrc,
            e.IsActive,
            e.Email,
            e.FirstAppraiserId,
            FirstAppraiserSapId = e.FirstAppraiser != null ? e.FirstAppraiser.SapId : null,
            FirstAppraiserName = e.FirstAppraiser != null ? e.FirstAppraiser.FullName : null,
            e.SecondAppraiserId,
            SecondAppraiserSapId = e.SecondAppraiser != null ? e.SecondAppraiser.SapId : null,
            SecondAppraiserName = e.SecondAppraiser != null ? e.SecondAppraiser.FullName : null,
            e.CoAppraiserId,
            CoAppraiserSapId = e.CoAppraiser != null ? e.CoAppraiser.SapId : null,
            CoAppraiserName = e.CoAppraiser != null ? e.CoAppraiser.FullName : null,
            FormTypeAssigned = EmployeeImportService.DetermineFormType(e.Grade, e.IsMrtOrMrc).ToString(),
            e.CreatedAt,
            e.UpdatedAt
        }).ToListAsync();

        return Ok(employees);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetEmployeeById(Guid id)
    {
        var emp = await _db.Employees
            .Include(e => e.FirstAppraiser)
            .Include(e => e.SecondAppraiser)
            .Include(e => e.CoAppraiser)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (emp == null) return NotFound(new { message = "Employee not found." });

        return Ok(new
        {
            emp.Id,
            emp.SapId,
            emp.FullName,
            emp.Grade,
            emp.Designation,
            emp.Location,
            emp.ReportingGroup,
            emp.Division,
            emp.WingDepartment,
            emp.RegionBranch,
            emp.IsMrtOrMrc,
            emp.IsActive,
            emp.Email,
            emp.FirstAppraiserId,
            FirstAppraiserSapId = emp.FirstAppraiser?.SapId,
            FirstAppraiserName = emp.FirstAppraiser?.FullName,
            emp.SecondAppraiserId,
            SecondAppraiserSapId = emp.SecondAppraiser?.SapId,
            SecondAppraiserName = emp.SecondAppraiser?.FullName,
            emp.CoAppraiserId,
            CoAppraiserSapId = emp.CoAppraiser?.SapId,
            CoAppraiserName = emp.CoAppraiser?.FullName,
            FormTypeAssigned = EmployeeImportService.DetermineFormType(emp.Grade, emp.IsMrtOrMrc).ToString(),
            emp.CreatedAt,
            emp.UpdatedAt
        });
    }

    /// <summary>
    /// Creates a single employee record in the database.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.SapId))
            return BadRequest(new { message = "SAP ID is mandatory." });
        if (string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest(new { message = "Full Name is mandatory." });
        if (string.IsNullOrWhiteSpace(dto.Grade))
            return BadRequest(new { message = "Grade is mandatory." });

        var trimmedSapId = dto.SapId.Trim();
        var existing = await _db.Employees.AnyAsync(e => e.SapId == trimmedSapId);
        if (existing)
        {
            return BadRequest(new { message = $"An employee with SAP ID '{trimmedSapId}' already exists in the system." });
        }

        Guid? firstAppraiserId = null;
        if (!string.IsNullOrWhiteSpace(dto.FirstAppraiserSapId))
        {
            var first = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.FirstAppraiserSapId.Trim());
            if (first != null) firstAppraiserId = first.Id;
        }

        Guid? secondAppraiserId = null;
        if (!string.IsNullOrWhiteSpace(dto.SecondAppraiserSapId))
        {
            var second = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.SecondAppraiserSapId.Trim());
            if (second != null) secondAppraiserId = second.Id;
        }

        Guid? coAppraiserId = null;
        if (!string.IsNullOrWhiteSpace(dto.CoAppraiserSapId))
        {
            var co = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.CoAppraiserSapId.Trim());
            if (co != null) coAppraiserId = co.Id;
        }

        var matchedGrade = await _db.GradeMappings.FirstOrDefaultAsync(g => g.EsgCode == dto.Grade.Trim() || g.GradeName == dto.Grade.Trim() || g.GradeCode == dto.Grade.Trim());
        string normalizedGrade = matchedGrade?.EsgCode ?? dto.Grade.Trim();

        var matchedGroup = await _db.ReportingGroups.FirstOrDefaultAsync(g => g.RpsaCode == dto.ReportingGroup.Trim() || g.GroupName == dto.ReportingGroup.Trim() || g.GroupCode == dto.ReportingGroup.Trim());
        string normalizedGroup = matchedGroup?.RpsaCode ?? dto.ReportingGroup.Trim();

        var employee = new Employee
        {
            SapId = trimmedSapId,
            FullName = dto.FullName.Trim(),
            Grade = normalizedGrade,
            Designation = dto.Designation?.Trim() ?? "Officer",
            Location = dto.Location?.Trim() ?? "Head Office",
            ReportingGroup = normalizedGroup,
            Division = dto.Division?.Trim() ?? "General",
            WingDepartment = dto.WingDepartment?.Trim() ?? "Operations",
            RegionBranch = dto.RegionBranch?.Trim() ?? "Karachi Main",
            Email = !string.IsNullOrWhiteSpace(dto.Email) ? dto.Email.Trim() : $"{trimmedSapId}@nbp.com.pk",
            IsMrtOrMrc = dto.IsMrtOrMrc,
            IsActive = dto.IsActive,
            FirstAppraiserId = firstAppraiserId,
            SecondAppraiserId = secondAppraiserId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Employees.Add(employee);

        // If requested to create portal login user account
        if (dto.CreatePortalUser)
        {
            var existingUser = await _db.SystemUsers.AnyAsync(u => u.Username == trimmedSapId);
            if (!existingUser)
            {
                string[] seniorGrades = ["01", "02", "03", "04", "05", "VP", "SVP", "EVP", "SEVP", "PRESIDENT", "CEO"];
                string assignedRole = dto.PortalUserRole ?? (
                    seniorGrades.Contains(employee.Grade.ToUpper()) 
                        ? "SecondAppraiser" 
                        : "Employee"
                );

                var newUser = new SystemUser
                {
                    Username = trimmedSapId,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Nbp@12345!"),
                    FullName = employee.FullName,
                    Email = !string.IsNullOrWhiteSpace(employee.Email) ? employee.Email : $"{trimmedSapId}@nbp.com.pk",
                    Role = assignedRole,
                    EmployeeId = employee.Id,
                    IsActive = true,
                    MustChangePassword = true,
                    CreatedAt = DateTime.UtcNow
                };
                _db.SystemUsers.Add(newUser);
            }
        }

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "EMPLOYEE_CREATED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(Employee),
            TargetEntityId = employee.Id.ToString(),
            ActionDescription = $"Created Employee record for {employee.FullName} (SAP ID: {employee.SapId}, Grade: {employee.Grade}, Group: {employee.ReportingGroup}).",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEmployeeById), new { id = employee.Id }, new
        {
            employee.Id,
            employee.SapId,
            employee.FullName,
            employee.Grade,
            employee.Designation,
            employee.ReportingGroup,
            employee.Email,
            employee.IsMrtOrMrc,
            employee.IsActive,
            FormTypeAssigned = EmployeeImportService.DetermineFormType(employee.Grade, employee.IsMrtOrMrc).ToString(),
            message = "Employee created successfully."
        });
    }

    /// <summary>
    /// Updates an existing employee record.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(Guid id, [FromBody] UpdateEmployeeDto dto)
    {
        var employee = await _db.Employees.FirstOrDefaultAsync(e => e.Id == id);
        if (employee == null)
        {
            return NotFound(new { message = "Employee record not found." });
        }

        Guid? firstAppraiserId = null;
        if (!string.IsNullOrWhiteSpace(dto.FirstAppraiserSapId))
        {
            var first = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.FirstAppraiserSapId.Trim());
            if (first != null && first.Id != id) firstAppraiserId = first.Id;
        }

        Guid? secondAppraiserId = null;
        if (!string.IsNullOrWhiteSpace(dto.SecondAppraiserSapId))
        {
            var second = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.SecondAppraiserSapId.Trim());
            if (second != null && second.Id != id) secondAppraiserId = second.Id;
        }

        Guid? coAppraiserId = null;
        if (!string.IsNullOrWhiteSpace(dto.CoAppraiserSapId))
        {
            var co = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.CoAppraiserSapId.Trim());
            if (co != null && co.Id != id) coAppraiserId = co.Id;
        }

        var matchedUpdateGrade = await _db.GradeMappings.FirstOrDefaultAsync(g => g.EsgCode == dto.Grade.Trim() || g.GradeName == dto.Grade.Trim() || g.GradeCode == dto.Grade.Trim());
        string normalizedUpdateGrade = matchedUpdateGrade?.EsgCode ?? dto.Grade.Trim();

        var matchedUpdateGroup = await _db.ReportingGroups.FirstOrDefaultAsync(g => g.RpsaCode == dto.ReportingGroup.Trim() || g.GroupName == dto.ReportingGroup.Trim() || g.GroupCode == dto.ReportingGroup.Trim());
        string normalizedUpdateGroup = matchedUpdateGroup?.RpsaCode ?? dto.ReportingGroup.Trim();

        employee.FullName = dto.FullName.Trim();
        employee.Grade = normalizedUpdateGrade;
        employee.Designation = dto.Designation?.Trim() ?? employee.Designation;
        employee.Location = dto.Location?.Trim() ?? employee.Location;
        employee.ReportingGroup = normalizedUpdateGroup;
        employee.Division = dto.Division?.Trim() ?? employee.Division;
        employee.WingDepartment = dto.WingDepartment?.Trim() ?? employee.WingDepartment;
        employee.RegionBranch = dto.RegionBranch?.Trim() ?? employee.RegionBranch;
        employee.Email = !string.IsNullOrWhiteSpace(dto.Email) ? dto.Email.Trim() : employee.Email;
        employee.IsMrtOrMrc = dto.IsMrtOrMrc;
        employee.IsActive = dto.IsActive;
        employee.FirstAppraiserId = firstAppraiserId;
        employee.SecondAppraiserId = secondAppraiserId;
        employee.CoAppraiserId = coAppraiserId;
        employee.UpdatedAt = DateTime.UtcNow;

        // Also update associated SystemUser if exists
        var systemUser = await _db.SystemUsers.FirstOrDefaultAsync(u => u.EmployeeId == employee.Id || u.Username == employee.SapId);
        if (systemUser != null)
        {
            systemUser.FullName = employee.FullName;
            systemUser.Email = employee.Email ?? systemUser.Email;
            systemUser.IsActive = employee.IsActive;
        }

        // If employee has active EmployeeCycle, keep appraiser links synchronized
        var empCycles = await _db.EmployeeCycles.Where(ec => ec.EmployeeId == employee.Id).ToListAsync();
        foreach (var empCycle in empCycles)
        {
            if (firstAppraiserId.HasValue) empCycle.FirstAppraiserId = firstAppraiserId.Value;
            if (secondAppraiserId.HasValue) empCycle.SecondAppraiserId = secondAppraiserId.Value;
            empCycle.CoAppraiserId = coAppraiserId;
            empCycle.PendingCoAppraiserSapId = null;
            empCycle.AssignedFormType = EmployeeImportService.DetermineFormType(employee.Grade, employee.IsMrtOrMrc);
        }

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "EMPLOYEE_UPDATED",
            ActorUserId = dto.ActorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(Employee),
            TargetEntityId = employee.Id.ToString(),
            ActionDescription = $"Updated Employee record for {employee.FullName} (SAP ID: {employee.SapId}, Grade: {employee.Grade}, Group: {employee.ReportingGroup}).",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            employee.Id,
            employee.SapId,
            employee.FullName,
            employee.Grade,
            employee.Designation,
            employee.ReportingGroup,
            employee.Email,
            employee.IsMrtOrMrc,
            employee.IsActive,
            FormTypeAssigned = EmployeeImportService.DetermineFormType(employee.Grade, employee.IsMrtOrMrc).ToString(),
            message = "Employee updated successfully."
        });
    }

    /// <summary>
    /// Removes an employee record from the database, unlinking dependencies safely.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(Guid id, [FromQuery] string? actorUserId)
    {
        var employee = await _db.Employees.FirstOrDefaultAsync(e => e.Id == id);
        if (employee == null)
        {
            return NotFound(new { message = "Employee record not found." });
        }

        // 1. Unlink any direct reports where this employee was appraiser
        var firstReports = await _db.Employees.Where(e => e.FirstAppraiserId == id).ToListAsync();
        foreach (var r in firstReports) r.FirstAppraiserId = null;

        var secondReports = await _db.Employees.Where(e => e.SecondAppraiserId == id).ToListAsync();
        foreach (var r in secondReports) r.SecondAppraiserId = null;

        // 2. Unlink any portal users
        var systemUsers = await _db.SystemUsers.Where(u => u.EmployeeId == id || u.Username == employee.SapId).ToListAsync();
        foreach (var u in systemUsers)
        {
            u.EmployeeId = null;
        }

        // 3. Remove associated EmployeeCycles
        var empCycles = await _db.EmployeeCycles.Where(ec => ec.EmployeeId == id).ToListAsync();
        if (empCycles.Any())
        {
            var cycleIds = empCycles.Select(ec => ec.Id).ToList();
            var objectives = await _db.Objectives.Where(o => cycleIds.Contains(o.EmployeeCycleId)).ToListAsync();
            _db.Objectives.RemoveRange(objectives);

            var devReviews = await _db.DevelopmentReviews.Where(dr => cycleIds.Contains(dr.EmployeeCycleId)).ToListAsync();
            _db.DevelopmentReviews.RemoveRange(devReviews);

            var disagreements = await _db.DisagreementCases.Where(d => cycleIds.Contains(d.EmployeeCycleId)).ToListAsync();
            _db.DisagreementCases.RemoveRange(disagreements);

            _db.EmployeeCycles.RemoveRange(empCycles);
        }

        // 4. Remove Employee
        _db.Employees.Remove(employee);

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "EMPLOYEE_DELETED",
            ActorUserId = actorUserId ?? "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            TargetEntityType = nameof(Employee),
            TargetEntityId = id.ToString(),
            ActionDescription = $"Deleted Employee record for {employee.FullName} (SAP ID: {employee.SapId}).",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"Employee '{employee.FullName}' (SAP ID: {employee.SapId}) removed successfully."
        });
    }

    /// <summary>
    /// Bulk imports employee records from CSV/XLSX. Restricted strictly to PMW Super Admin.
    /// PMW Admin enrolls from existing records in the system.
    /// </summary>
    [HttpPost("import")]
    public async Task<IActionResult> ImportEmployees(
        [FromBody] List<EmployeeImportRowDto> rows,
        [FromQuery] Guid? cycleId,
        [FromQuery] string? actorUserId,
        [FromQuery] string? role)
    {
        if (role != "PmwSuperAdmin" && actorUserId != "PMW_SUPER_ADMIN")
        {
            return StatusCode(403, new
            {
                message = "Access Denied. Employee batch/file uploads are restricted exclusively to PMW Super Admin. PMW Admin can only enroll employees from existing records in the system."
            });
        }

        var result = await _importService.ProcessImportAsync(rows, cycleId, actorUserId ?? "PMW_SUPER_ADMIN");
        if (result.ErrorCount > 0 && result.SuccessfulImports == 0)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// PMW Admin or GPM updates/overrides Appraiser & Supervisor pre-validated information for an individual employee or in bulk.
    /// </summary>
    [HttpPost("bulk-update-appraisers")]
    public async Task<IActionResult> BulkUpdateAppraisers([FromBody] BulkAppraiserOverrideRequestDto dto)
    {
        int updatedCount = 0;
        foreach (var item in dto.Mappings)
        {
            if (string.IsNullOrWhiteSpace(item.EmployeeSapId)) continue;

            var emp = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == item.EmployeeSapId.Trim());
            if (emp == null) continue;

            var empCycle = await _db.EmployeeCycles.FirstOrDefaultAsync(ec => ec.EmployeeId == emp.Id);
            if (empCycle == null) continue;

            if (!string.IsNullOrWhiteSpace(item.FirstAppraiserSapId))
            {
                var first = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == item.FirstAppraiserSapId.Trim());
                if (first != null)
                {
                    emp.FirstAppraiserId = first.Id;
                    empCycle.FirstAppraiserId = first.Id;
                }
            }

            if (!string.IsNullOrWhiteSpace(item.SecondAppraiserSapId))
            {
                var second = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == item.SecondAppraiserSapId.Trim());
                if (second != null)
                {
                    emp.SecondAppraiserId = second.Id;
                    empCycle.SecondAppraiserId = second.Id;
                }
            }

            empCycle.AppraiserValidationStatus = "Validated";
            empCycle.AppraiserValidatedAt = DateTime.UtcNow;
            empCycle.AppraiserValidatedBySapId = dto.ActorSapId;
            empCycle.PendingFirstAppraiserSapId = null;
            empCycle.PendingSecondAppraiserSapId = null;
            empCycle.AppraiserRejectionReason = null;

            updatedCount++;
        }

        var audit = new AuditEvent
        {
            EventType = "BULK_APPRAISERS_UPDATED_BY_ADMIN",
            ActorUserId = dto.ActorSapId,
            ActorRole = "PmwAdmin",
            ActionDescription = $"PMW Admin/GPM updated & pre-validated Appraiser/Supervisor mappings for {updatedCount} employees.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Successfully updated and pre-validated appraiser mappings for {updatedCount} staff members.", count = updatedCount });
    }

    /// <summary>
    /// Retrieves employee profile details by SAP ID, including hierarchical location metadata and breadcrumbs.
    /// </summary>
    [HttpGet("by-sap/{sapId}")]
    public async Task<IActionResult> GetEmployeeBySapId(string sapId)
    {
        var trimmedSapId = sapId.Trim();
        var emp = await _db.Employees
            .Include(e => e.FirstAppraiser)
            .Include(e => e.SecondAppraiser)
            .Include(e => e.CoAppraiser)
            .Include(e => e.LocationRef)
            .FirstOrDefaultAsync(e => e.SapId == trimmedSapId);

        if (emp == null) return NotFound(new { message = $"Employee with SAP ID '{trimmedSapId}' not found." });

        var breadcrumbs = new List<object>();
        if (emp.LocationRef != null && !string.IsNullOrWhiteSpace(emp.LocationRef.PSAPath))
        {
            var segments = emp.LocationRef.PSAPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length > 0)
            {
                var ancestorNodes = await _db.Locations
                    .AsNoTracking()
                    .Where(l => segments.Contains(l.PSACode))
                    .ToDictionaryAsync(l => l.PSACode);

                foreach (var seg in segments)
                {
                    if (ancestorNodes.TryGetValue(seg, out var anc))
                    {
                        breadcrumbs.Add(new
                        {
                            anc.PSACode,
                            anc.Name,
                            anc.DepthLevel
                        });
                    }
                }
            }
        }

        // Resolve Grade Title and Code
        var gradeMapping = await _db.GradeMappings
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.GradeCode == emp.Grade || g.EsgCode == emp.Grade || g.GradeName == emp.Grade);

        string resolvedGrade = gradeMapping?.GradeCode?.Replace("_", " ") ?? emp.Grade;
        string resolvedGradeTitle = (resolvedGrade.ToUpperInvariant()) switch
        {
            "01" or "PRESIDENT" or "CEO" => "President & CEO",
            "02" or "SEVP" => "Senior Executive Vice President",
            "03" or "EVP" => "Executive Vice President",
            "04" or "SVP" => "Senior Vice President",
            "05" or "VP" => "Vice President",
            "06" or "AVP" => "Assistant Vice President",
            "07" or "OG I" or "OG_I" or "OG-I" => "Officer Grade I",
            "08" or "OG II" or "OG_II" or "OG-II" => "Officer Grade II",
            "09" or "OG III" or "OG_III" or "OG-III" => "Officer Grade III",
            _ => gradeMapping?.GradeName ?? resolvedGrade
        };

        // Resolve Reporting Group Name and Code
        var groupMapping = await _db.ReportingGroups
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.GroupCode == emp.ReportingGroup || g.RpsaCode == emp.ReportingGroup || g.GroupName == emp.ReportingGroup);

        string groupName = groupMapping?.GroupName ?? emp.ReportingGroup;
        string groupCode = groupMapping?.GroupCode ?? groupMapping?.RpsaCode ?? "";
        string groupFormatted = !string.IsNullOrWhiteSpace(groupCode) ? $"{groupName} ({groupCode})" : groupName;

        return Ok(new
        {
            emp.Id,
            emp.SapId,
            emp.FullName,
            emp.Grade,
            GradeCode = resolvedGrade,
            GradeTitle = resolvedGradeTitle,
            emp.Designation,
            emp.Location,
            emp.LocationPSACode,
            LocationDetails = emp.LocationRef != null ? new
            {
                emp.LocationRef.PSACode,
                emp.LocationRef.Name,
                emp.LocationRef.PACode,
                emp.LocationRef.Category,
                emp.LocationRef.City,
                emp.LocationRef.Country,
                emp.LocationRef.Latitude,
                emp.LocationRef.Longitude,
                emp.LocationRef.PSAPath,
                emp.LocationRef.DepthLevel
            } : null,
            Breadcrumbs = breadcrumbs,
            emp.ReportingGroup,
            ReportingGroupName = groupName,
            ReportingGroupCode = groupCode,
            ReportingGroupFormatted = groupFormatted,
            emp.Division,
            emp.WingDepartment,
            emp.RegionBranch,
            emp.IsMrtOrMrc,
            emp.IsActive,
            emp.Email,
            FirstAppraiser = emp.FirstAppraiser != null ? new
            {
                emp.FirstAppraiser.Id,
                emp.FirstAppraiser.SapId,
                emp.FirstAppraiser.FullName,
                emp.FirstAppraiser.Designation,
                emp.FirstAppraiser.Email
            } : null,
            SecondAppraiser = emp.SecondAppraiser != null ? new
            {
                emp.SecondAppraiser.Id,
                emp.SecondAppraiser.SapId,
                emp.SecondAppraiser.FullName,
                emp.SecondAppraiser.Designation,
                emp.SecondAppraiser.Email
            } : null,
            CoAppraiser = emp.CoAppraiser != null ? new
            {
                emp.CoAppraiser.Id,
                emp.CoAppraiser.SapId,
                emp.CoAppraiser.FullName,
                emp.CoAppraiser.Designation,
                emp.CoAppraiser.Email
            } : null,
            FormTypeAssigned = EmployeeImportService.DetermineFormType(emp.Grade, emp.IsMrtOrMrc).ToString(),
            emp.CreatedAt,
            emp.UpdatedAt
        });
    }

    /// <summary>
    /// Updates employee profile by SAP ID (e.g. location, email, name).
    /// </summary>
    [HttpPut("by-sap/{sapId}/profile")]
    public async Task<IActionResult> UpdateEmployeeProfile(string sapId, [FromBody] UpdateProfileDto dto)
    {
        var trimmedSapId = sapId.Trim();
        var employee = await _db.Employees
            .Include(e => e.LocationRef)
            .FirstOrDefaultAsync(e => e.SapId == trimmedSapId);

        if (employee == null)
        {
            return NotFound(new { message = $"Employee with SAP ID '{trimmedSapId}' not found." });
        }

        // FullName and Grade are governed exclusively by HR Master Records and cannot be updated by users.

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            employee.Email = dto.Email.Trim();
        }

        if (!string.IsNullOrWhiteSpace(dto.Designation))
        {
            employee.Designation = dto.Designation.Trim();
        }

        if (!string.IsNullOrWhiteSpace(dto.Division))
        {
            employee.Division = dto.Division.Trim();
        }

        if (!string.IsNullOrWhiteSpace(dto.WingDepartment))
        {
            employee.WingDepartment = dto.WingDepartment.Trim();
        }

        if (!string.IsNullOrWhiteSpace(dto.LocationPSACode))
        {
            var psa = dto.LocationPSACode.Trim();
            var targetLocation = await _db.Locations.FirstOrDefaultAsync(l => l.PSACode == psa);
            if (targetLocation == null)
            {
                return BadRequest(new { message = $"Location with PSA Code '{psa}' does not exist in the organizational hierarchy." });
            }

            employee.LocationPSACode = targetLocation.PSACode;
            employee.Location = targetLocation.Name;
            employee.RegionBranch = targetLocation.Name;
        }

        employee.UpdatedAt = DateTime.UtcNow;

        // Synchronize linked SystemUser if present
        var systemUser = await _db.SystemUsers.FirstOrDefaultAsync(u => u.EmployeeId == employee.Id || u.Username == employee.SapId);
        if (systemUser != null)
        {
            systemUser.FullName = employee.FullName;
            systemUser.Email = employee.Email ?? systemUser.Email;
        }

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "EMPLOYEE_PROFILE_UPDATED",
            ActorUserId = employee.SapId,
            ActorRole = "Employee",
            TargetEntityType = nameof(Employee),
            TargetEntityId = employee.Id.ToString(),
            ActionDescription = $"Employee {employee.FullName} ({employee.SapId}) updated profile details. Location linked to [{employee.LocationPSACode}] {employee.Location}.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return await GetEmployeeBySapId(employee.SapId);
    }
}

public record CreateEmployeeDto(
    string SapId,
    string FullName,
    string Grade,
    string? Designation,
    string? Location,
    string? ReportingGroup,
    string? Division,
    string? WingDepartment,
    string? RegionBranch,
    string? Email,
    bool IsMrtOrMrc = false,
    bool IsActive = true,
    string? FirstAppraiserSapId = null,
    string? SecondAppraiserSapId = null,
    string? CoAppraiserSapId = null,
    bool CreatePortalUser = true,
    string? PortalUserRole = null,
    string? ActorUserId = "PMW_ADMIN"
);

public record UpdateEmployeeDto(
    string FullName,
    string Grade,
    string? Designation,
    string? Location,
    string? ReportingGroup,
    string? Division,
    string? WingDepartment,
    string? RegionBranch,
    string? Email,
    bool IsMrtOrMrc = false,
    bool IsActive = true,
    string? FirstAppraiserSapId = null,
    string? SecondAppraiserSapId = null,
    string? CoAppraiserSapId = null,
    string? ActorUserId = "PMW_ADMIN"
);

public record EmployeeAppraiserMappingDto(string EmployeeSapId, string FirstAppraiserSapId, string SecondAppraiserSapId);
public record BulkAppraiserOverrideRequestDto(List<EmployeeAppraiserMappingDto> Mappings, string ActorSapId = "PMW_ADMIN");
public record UpdateProfileDto(
    string? LocationPSACode = null,
    string? Email = null,
    string? Designation = null,
    string? Division = null,
    string? WingDepartment = null
);
