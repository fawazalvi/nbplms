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
        var query = _db.Employees.AsQueryable();

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
            query = query.Where(e => e.FullName.Contains(search) || e.SapId.Contains(search));
        }

        var employees = await query.Select(e => new
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
            e.Email,
            FormTypeAssigned = EmployeeImportService.DetermineFormType(e.Grade, e.IsMrtOrMrc).ToString()
        }).ToListAsync();

        return Ok(employees);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetEmployeeById(Guid id)
    {
        var emp = await _db.Employees
            .Include(e => e.FirstAppraiser)
            .Include(e => e.SecondAppraiser)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (emp == null) return NotFound(new { message = "Employee not found." });

        return Ok(emp);
    }

    [HttpPost("import")]
    public async Task<IActionResult> ImportEmployees([FromBody] List<EmployeeImportRowDto> rows)
    {
        var result = await _importService.ProcessImportAsync(rows);
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
}

public record EmployeeAppraiserMappingDto(string EmployeeSapId, string FirstAppraiserSapId, string SecondAppraiserSapId);
public record BulkAppraiserOverrideRequestDto(List<EmployeeAppraiserMappingDto> Mappings, string ActorSapId = "PMW_ADMIN");
