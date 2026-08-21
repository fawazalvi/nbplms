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

    [HttpGet("groups")]
    public async Task<IActionResult> GetReportingGroups()
    {
        var groups = await _db.ReportingGroups.OrderBy(g => g.GroupName).ToListAsync();

        if (groups.Count == 0)
        {
            var defaultGroups = new List<ReportingGroup>
            {
                new ReportingGroup { GroupCode = "CBG", GroupName = "Commercial Banking Group" },
                new ReportingGroup { GroupCode = "RBG", GroupName = "Consumer Banking Group" },
                new ReportingGroup { GroupCode = "RMG", GroupName = "Risk Management Group" },
                new ReportingGroup { GroupCode = "TGM", GroupName = "Treasury & Global Markets" },
                new ReportingGroup { GroupCode = "ITG", GroupName = "Information Technology Group" },
                new ReportingGroup { GroupCode = "OPS", GroupName = "Operations Group" },
                new ReportingGroup { GroupCode = "HRG", GroupName = "HR Management Group" },
                new ReportingGroup { GroupCode = "CMP", GroupName = "Compliance Group" },
            };
            _db.ReportingGroups.AddRange(defaultGroups);
            await _db.SaveChangesAsync();
            groups = defaultGroups;
        }

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
            ActionDescription = $"Created new NBP Reporting Group: {group.GroupName} ({group.GroupCode}).",
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
            var existing = await _db.ReportingGroups.FirstOrDefaultAsync(g => g.GroupCode == code);

            if (existing != null)
            {
                existing.GroupName = row.GroupName.Trim();
                existing.HeadOfGroupSapId = row.HeadOfGroupSapId;
            }
            else
            {
                _db.ReportingGroups.Add(new ReportingGroup
                {
                    GroupCode = code,
                    GroupName = row.GroupName.Trim(),
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
            ActionDescription = $"Bulk imported/updated {importedCount} Reporting Groups into SQL Server database.",
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
        group.HeadOfGroupSapId = dto.HeadOfGroupSapId;
        group.IsActive = dto.IsActive;

        var audit = new AuditEvent
        {
            EventType = "REPORTING_GROUP_UPDATED",
            ActorUserId = dto.ActorUserId,
            ActorRole = "PmwAdmin",
            TargetEntityId = group.Id.ToString(),
            TargetEntityType = nameof(ReportingGroup),
            ActionDescription = $"Updated NBP Reporting Group: {group.GroupName} ({group.GroupCode}).",
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

    [HttpGet("grades")]
    public async Task<IActionResult> GetGradeMappings()
    {
        var grades = await _db.GradeMappings.OrderBy(g => g.RankOrder).ToListAsync();

        if (grades.Count == 0)
        {
            var defaultGrades = new List<GradeMapping>
            {
                new GradeMapping { GradeCode = "OG_III", GradeName = "OG III", RankOrder = 1, DefaultFormType = "KPI_FORM" },
                new GradeMapping { GradeCode = "OG_II", GradeName = "OG II", RankOrder = 2, DefaultFormType = "KPI_FORM" },
                new GradeMapping { GradeCode = "OG_I", GradeName = "OG I", RankOrder = 3, DefaultFormType = "KPI_FORM" },
                new GradeMapping { GradeCode = "AVP", GradeName = "AVP", RankOrder = 4, DefaultFormType = "KPI_FORM" },
                new GradeMapping { GradeCode = "VP", GradeName = "VP", RankOrder = 5, DefaultFormType = "BALANCED_SCORECARD" },
                new GradeMapping { GradeCode = "SVP", GradeName = "SVP", RankOrder = 6, DefaultFormType = "BALANCED_SCORECARD" },
                new GradeMapping { GradeCode = "EVP", GradeName = "EVP", RankOrder = 7, DefaultFormType = "BALANCED_SCORECARD" },
                new GradeMapping { GradeCode = "SEVP", GradeName = "SEVP", RankOrder = 8, DefaultFormType = "BALANCED_SCORECARD" },
                new GradeMapping { GradeCode = "PRESIDENT", GradeName = "President/CEO", RankOrder = 9, DefaultFormType = "BALANCED_SCORECARD" },
            };
            _db.GradeMappings.AddRange(defaultGrades);
            await _db.SaveChangesAsync();
            grades = defaultGrades;
        }

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
            ActionDescription = $"Created new Grade Mapping: {grade.GradeName} (Rank {grade.RankOrder}, Form: {grade.DefaultFormType}).",
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
            var existing = await _db.GradeMappings.FirstOrDefaultAsync(g => g.GradeCode == code);

            if (existing != null)
            {
                existing.GradeName = row.GradeName.Trim();
                existing.RankOrder = row.RankOrder;
                existing.DefaultFormType = row.DefaultFormType ?? "KPI_FORM";
            }
            else
            {
                _db.GradeMappings.Add(new GradeMapping
                {
                    GradeCode = code,
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
            ActionDescription = $"Bulk imported/updated {importedCount} Grade Mappings into SQL Server database.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Successfully imported {importedCount} grade mappings into database.", count = importedCount });
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

    #endregion
}

public record CreateGroupDto(string GroupCode, string GroupName, string? HeadOfGroupSapId, string ActorUserId = "PMW_ADMIN");
public record CreateGradeDto(string GradeCode, string GradeName, int RankOrder, string DefaultFormType, string ActorUserId = "PMW_ADMIN");
public record UpdateGroupDto(string GroupCode, string GroupName, string? HeadOfGroupSapId, bool IsActive = true, string ActorUserId = "PMW_ADMIN");
