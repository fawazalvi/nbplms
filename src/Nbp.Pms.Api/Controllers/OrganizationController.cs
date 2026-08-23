using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class OrganizationController : ControllerBase
{
    private readonly PmsDbContext _db;

    public OrganizationController(PmsDbContext db)
    {
        _db = db;
    }

    #region Reporting Groups

    private static string? FormatRpsaCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        string digits = new string(code.Where(char.IsDigit).ToArray());
        if (int.TryParse(digits, out int num))
        {
            return num.ToString("D4");
        }
        return code.Trim().PadLeft(4, '0');
    }

    [HttpGet("groups")]
    public async Task<IActionResult> GetReportingGroups()
    {
        var allGroups = await _db.ReportingGroups.OrderBy(g => g.RpsaCode).ThenBy(g => g.GroupName).ToListAsync();

        // In-memory deduplication by RpsaCode or GroupCode to guarantee unique master groups
        var groups = allGroups
            .GroupBy(g => !string.IsNullOrWhiteSpace(g.RpsaCode) ? g.RpsaCode.PadLeft(4, '0') : g.GroupCode)
            .Select(grp => grp.OrderByDescending(g => g.CreatedAt).First())
            .OrderBy(g => g.RpsaCode ?? g.GroupCode)
            .ToList();

        return Ok(groups);
    }

    [HttpPost("groups")]
    public async Task<IActionResult> CreateReportingGroup([FromBody] CreateGroupDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.GroupName) || string.IsNullOrWhiteSpace(dto.GroupCode))
        {
            return BadRequest(new { message = "Group Name and Group Code are required." });
        }

        var group = new ReportingGroup
        {
            GroupCode = dto.GroupCode.Trim().ToUpperInvariant(),
            GroupName = dto.GroupName.Trim(),
            RpsaCode = FormatRpsaCode(dto.RpsaCode),
            HeadOfGroupSapId = dto.HeadOfGroupSapId,
            IsActive = true
        };

        _db.ReportingGroups.Add(group);

        var audit = new AuditEvent
        {
            EventType = "REPORTING_GROUP_CREATED",
            ActorUserId = dto.ActorUserId,
            ActorRole = "PmwAdmin",
            TargetEntityId = group.Id.ToString(),
            TargetEntityType = nameof(ReportingGroup),
            ActionDescription = $"Created new NBP Reporting Group: {group.GroupName} ({group.GroupCode}) with RPSA Code: {group.RpsaCode}.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(group);
    }

    [HttpPost("groups/import")]
    public async Task<IActionResult> ImportReportingGroups([FromBody] List<CreateGroupDto> rows)
    {
        int importedCount = 0;
        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.GroupCode) || string.IsNullOrWhiteSpace(row.GroupName)) continue;

            string code = row.GroupCode.Trim().ToUpperInvariant();
            string? rpsa = FormatRpsaCode(row.RpsaCode);
            var existing = await _db.ReportingGroups.FirstOrDefaultAsync(g => g.GroupCode == code);

            if (existing != null)
            {
                existing.GroupName = row.GroupName.Trim();
                if (!string.IsNullOrWhiteSpace(rpsa)) existing.RpsaCode = rpsa;
                existing.HeadOfGroupSapId = row.HeadOfGroupSapId;
            }
            else
            {
                _db.ReportingGroups.Add(new ReportingGroup
                {
                    GroupCode = code,
                    GroupName = row.GroupName.Trim(),
                    RpsaCode = rpsa,
                    HeadOfGroupSapId = row.HeadOfGroupSapId,
                    IsActive = true
                });
            }
            importedCount++;
        }

        var audit = new AuditEvent
        {
            EventType = "BULK_REPORTING_GROUPS_IMPORTED",
            ActorUserId = "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            ActionDescription = $"Bulk imported/updated {importedCount} Reporting Groups with RPSA codes into SQL Server database.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Successfully imported {importedCount} reporting groups into database.", count = importedCount });
    }

    [HttpDelete("groups/{id}")]
    public async Task<IActionResult> DeleteReportingGroup(Guid id, [FromQuery] string actorUserId = "PMW_ADMIN")
    {
        var group = await _db.ReportingGroups.FindAsync(id);
        if (group == null) return NotFound();

        _db.ReportingGroups.Remove(group);

        var audit = new AuditEvent
        {
            EventType = "REPORTING_GROUP_DELETED",
            ActorUserId = actorUserId,
            ActorRole = "PmwAdmin",
            TargetEntityId = id.ToString(),
            TargetEntityType = nameof(ReportingGroup),
            ActionDescription = $"Deleted NBP Reporting Group: {group.GroupName} ({group.GroupCode}).",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Reporting Group deleted successfully." });
    }

    [HttpPut("groups/{id}")]
    public async Task<IActionResult> UpdateReportingGroup(Guid id, [FromBody] UpdateGroupDto dto)
    {
        var group = await _db.ReportingGroups.FindAsync(id);
        if (group == null) return NotFound();

        group.GroupCode = dto.GroupCode.Trim().ToUpperInvariant();
        group.GroupName = dto.GroupName.Trim();
        group.RpsaCode = FormatRpsaCode(dto.RpsaCode) ?? group.RpsaCode;
        group.HeadOfGroupSapId = dto.HeadOfGroupSapId;
        group.IsActive = dto.IsActive;

        var audit = new AuditEvent
        {
            EventType = "REPORTING_GROUP_UPDATED",
            ActorUserId = dto.ActorUserId,
            ActorRole = "PmwAdmin",
            TargetEntityId = group.Id.ToString(),
            TargetEntityType = nameof(ReportingGroup),
            ActionDescription = $"Updated NBP Reporting Group: {group.GroupName} ({group.GroupCode}) with RPSA Code: {group.RpsaCode}.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(group);
    }

    [HttpGet("groups/summary")]
    public async Task<IActionResult> GetReportingGroupsSummary()
    {
        var summary = await _db.ReportingGroups
            .Select(g => new
            {
                id = g.Id,
                groupCode = g.GroupCode,
                groupName = g.GroupName,
                rpsaCode = g.RpsaCode,
                headOfGroupSapId = g.HeadOfGroupSapId,
                isActive = g.IsActive,
                createdAt = g.CreatedAt,
                employeeCount = _db.Employees.Count(e => e.ReportingGroup == g.GroupName)
            })
            .OrderBy(g => g.groupName)
            .ToListAsync();

        return Ok(summary);
    }

    #endregion

    #region Grade Hierarchy Mappings

    private static string? FormatEsgCode(string? code, int fallbackRank = 1)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return fallbackRank.ToString("D2");
        }
        string digits = new string(code.Where(char.IsDigit).ToArray());
        if (int.TryParse(digits, out int num))
        {
            return num.ToString("D2");
        }
        return code.Trim().PadLeft(2, '0');
    }

    [HttpGet("grades")]
    public async Task<IActionResult> GetGradeMappings()
    {
        var allGrades = await _db.GradeMappings.OrderBy(g => g.RankOrder).ToListAsync();

        // In-memory deduplication by GradeCode or EsgCode to guarantee unique master grades
        var grades = allGrades
            .GroupBy(g => !string.IsNullOrWhiteSpace(g.EsgCode) ? g.EsgCode.PadLeft(2, '0') : g.GradeCode)
            .Select(grp => grp.OrderByDescending(g => g.CreatedAt).First())
            .OrderBy(g => g.RankOrder)
            .ToList();

        return Ok(grades);
    }

    [HttpPost("grades")]
    public async Task<IActionResult> CreateGradeMapping([FromBody] CreateGradeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.GradeName) || string.IsNullOrWhiteSpace(dto.GradeCode))
        {
            return BadRequest(new { message = "Grade Name and Grade Code are required." });
        }

        var grade = new GradeMapping
        {
            GradeCode = dto.GradeCode.Trim().ToUpperInvariant(),
            EsgCode = FormatEsgCode(dto.EsgCode ?? dto.GradeNumericCode, dto.RankOrder),
            GradeName = dto.GradeName.Trim(),
            RankOrder = dto.RankOrder,
            DefaultFormType = dto.DefaultFormType ?? "KPI_FORM",
            IsActive = true
        };

        _db.GradeMappings.Add(grade);

        var audit = new AuditEvent
        {
            EventType = "GRADE_MAPPING_CREATED",
            ActorUserId = dto.ActorUserId,
            ActorRole = "PmwAdmin",
            TargetEntityId = grade.Id.ToString(),
            TargetEntityType = nameof(GradeMapping),
            ActionDescription = $"Created new Grade Mapping: {grade.GradeName} ({grade.GradeCode}) with ESG code: {grade.EsgCode}.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(grade);
    }

    [HttpPost("grades/import")]
    public async Task<IActionResult> ImportGradeMappings([FromBody] List<CreateGradeDto> rows)
    {
        int importedCount = 0;
        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.GradeCode) || string.IsNullOrWhiteSpace(row.GradeName)) continue;

            string code = row.GradeCode.Trim().ToUpperInvariant();
            string? esg = FormatEsgCode(row.EsgCode ?? row.GradeNumericCode, row.RankOrder);
            var existing = await _db.GradeMappings.FirstOrDefaultAsync(g => g.GradeCode == code);

            if (existing != null)
            {
                existing.GradeName = row.GradeName.Trim();
                if (!string.IsNullOrWhiteSpace(esg)) existing.EsgCode = esg;
                existing.RankOrder = row.RankOrder;
                existing.DefaultFormType = row.DefaultFormType ?? "KPI_FORM";
            }
            else
            {
                _db.GradeMappings.Add(new GradeMapping
                {
                    GradeCode = code,
                    EsgCode = esg,
                    GradeName = row.GradeName.Trim(),
                    RankOrder = row.RankOrder,
                    DefaultFormType = row.DefaultFormType ?? "KPI_FORM",
                    IsActive = true
                });
            }
            importedCount++;
        }

        var audit = new AuditEvent
        {
            EventType = "BULK_GRADE_MAPPINGS_IMPORTED",
            ActorUserId = "PMW_ADMIN",
            ActorRole = "PmwAdmin",
            ActionDescription = $"Bulk imported/updated {importedCount} Grade Mappings with 2-digit ESG codes into SQL Server database.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Successfully imported {importedCount} grade mappings with ESG codes into database.", count = importedCount });
    }

    [HttpDelete("grades/{id}")]
    public async Task<IActionResult> DeleteGradeMapping(Guid id, [FromQuery] string actorUserId = "PMW_ADMIN")
    {
        var grade = await _db.GradeMappings.FindAsync(id);
        if (grade == null) return NotFound();

        _db.GradeMappings.Remove(grade);

        var audit = new AuditEvent
        {
            EventType = "GRADE_MAPPING_DELETED",
            ActorUserId = actorUserId,
            ActorRole = "PmwAdmin",
            TargetEntityId = id.ToString(),
            TargetEntityType = nameof(GradeMapping),
            ActionDescription = $"Deleted Grade Mapping: {grade.GradeName}.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Grade Mapping deleted successfully." });
    }

    [HttpPut("grades/{id}")]
    public async Task<IActionResult> UpdateGradeMapping(Guid id, [FromBody] UpdateGradeDto dto)
    {
        var grade = await _db.GradeMappings.FindAsync(id);
        if (grade == null) return NotFound();

        grade.GradeCode = dto.GradeCode.Trim().ToUpperInvariant();
        grade.EsgCode = FormatEsgCode(dto.EsgCode ?? dto.GradeNumericCode, dto.RankOrder) ?? grade.EsgCode;
        grade.GradeName = dto.GradeName.Trim();
        grade.RankOrder = dto.RankOrder;
        grade.DefaultFormType = dto.DefaultFormType ?? grade.DefaultFormType;
        grade.IsActive = dto.IsActive;

        var audit = new AuditEvent
        {
            EventType = "GRADE_MAPPING_UPDATED",
            ActorUserId = dto.ActorUserId,
            ActorRole = "PmwAdmin",
            TargetEntityId = grade.Id.ToString(),
            TargetEntityType = nameof(GradeMapping),
            ActionDescription = $"Updated Grade Mapping: {grade.GradeName} ({grade.GradeCode}) with ESG code: {grade.EsgCode}.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(grade);
    }

    #endregion
}

public record CreateGroupDto(string GroupCode, string GroupName, string? RpsaCode, string? HeadOfGroupSapId, string ActorUserId = "PMW_ADMIN");
public record CreateGradeDto(string GradeCode, string GradeName, string? EsgCode, int RankOrder, string DefaultFormType, string ActorUserId = "PMW_ADMIN", string? GradeNumericCode = null);
public record UpdateGroupDto(string GroupCode, string GroupName, string? RpsaCode, string? HeadOfGroupSapId, bool IsActive = true, string ActorUserId = "PMW_ADMIN");
public record UpdateGradeDto(string GradeCode, string GradeName, string? EsgCode, int RankOrder, string DefaultFormType, bool IsActive = true, string ActorUserId = "PMW_ADMIN", string? GradeNumericCode = null);

