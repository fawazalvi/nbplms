using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Persistence;

namespace Nbp.Pms.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class UsersController : ControllerBase
{
    private readonly PmsDbContext _db;

    public UsersController(PmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] string? role, [FromQuery] string? search)
    {
        var query = _db.Employees.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(u => u.FullName.Contains(search) || u.SapId.Contains(search) || (u.Email != null && u.Email.Contains(search)));
        }

        var users = await query.Select(u => new
        {
            u.Id,
            u.SapId,
            u.FullName,
            u.Email,
            u.Grade,
            u.Designation,
            u.ReportingGroup,
            u.RegionBranch,
            u.IsActive,
            u.IsLockedOut,
            Role = u.Grade.Contains("President") || u.Grade.Contains("SEVP") ? "PmwSuperAdmin" :
                   u.Grade.Contains("VP") || u.Grade.Contains("SVP") ? "GroupPerformanceManager" :
                   u.Grade.Contains("AVP") ? "FirstAppraiser" : "Employee"
        }).ToListAsync();

        return Ok(users);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.SapId) || string.IsNullOrWhiteSpace(dto.FullName))
        {
            return BadRequest(new { message = "SAP ID and Full Name are required." });
        }

        var existing = await _db.Employees.FirstOrDefaultAsync(u => u.SapId == dto.SapId);
        if (existing != null)
        {
            return BadRequest(new { message = $"User with SAP ID {dto.SapId} already exists." });
        }

        var newUser = new Employee
        {
            Id = Guid.NewGuid(),
            SapId = dto.SapId.Trim(),
            FullName = dto.FullName.Trim(),
            Email = dto.Email?.Trim() ?? $"{dto.SapId}@nbp.com.pk",
            Grade = dto.Grade?.Trim() ?? "OG I",
            Designation = dto.Designation?.Trim() ?? "Officer",
            Location = dto.Location?.Trim() ?? "Head Office",
            ReportingGroup = dto.ReportingGroup?.Trim() ?? "General Banking",
            Division = dto.Division?.Trim() ?? "Operations",
            WingDepartment = dto.WingDepartment?.Trim() ?? "General",
            RegionBranch = dto.RegionBranch?.Trim() ?? "Karachi Main",
            IsActive = true,
            IsLockedOut = false
        };

        _db.Employees.Add(newUser);

        var audit = new AuditEvent
        {
            EventType = "USER_ACCOUNT_CREATED",
            ActorUserId = dto.ActorUserId,
            ActorRole = "PmwSuperAdmin",
            TargetEntityId = newUser.Id.ToString(),
            TargetEntityType = nameof(Employee),
            ActionDescription = $"Created new system user account for {newUser.FullName} (SAP ID: {newUser.SapId}, Role: {dto.AssignedRole}).",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();

        return Ok(new { message = "System user created successfully.", user = newUser });
    }

    [HttpPost("{id}/toggle-status")]
    public async Task<IActionResult> ToggleUserStatus(Guid id, [FromQuery] string actorUserId = "SUPER_ADMIN")
    {
        var user = await _db.Employees.FindAsync(id);
        if (user == null) return NotFound();

        user.IsActive = !user.IsActive;

        var audit = new AuditEvent
        {
            EventType = user.IsActive ? "USER_ACCOUNT_ACTIVATED" : "USER_ACCOUNT_DEACTIVATED",
            ActorUserId = actorUserId,
            ActorRole = "PmwSuperAdmin",
            TargetEntityId = id.ToString(),
            TargetEntityType = nameof(Employee),
            ActionDescription = $"User account status for {user.FullName} ({user.SapId}) toggled to {(user.IsActive ? "Active" : "Inactive")}.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = $"User status updated to {(user.IsActive ? "Active" : "Inactive")}.", isActive = user.IsActive });
    }

    [HttpPost("{id}/unlock")]
    public async Task<IActionResult> UnlockUser(Guid id, [FromQuery] string actorUserId = "SUPER_ADMIN")
    {
        var user = await _db.Employees.FindAsync(id);
        if (user == null) return NotFound();

        user.IsLockedOut = false;

        var audit = new AuditEvent
        {
            EventType = "USER_ACCOUNT_UNLOCKED",
            ActorUserId = actorUserId,
            ActorRole = "PmwSuperAdmin",
            TargetEntityId = id.ToString(),
            TargetEntityType = nameof(Employee),
            ActionDescription = $"Unlocked user account for {user.FullName} ({user.SapId}).",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = "User account unlocked successfully." });
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetUserPassword(Guid id, [FromQuery] string actorUserId = "SUPER_ADMIN")
    {
        var user = await _db.Employees.FindAsync(id);
        if (user == null) return NotFound();

        string resetToken = Guid.NewGuid().ToString("N")[..12];

        var audit = new AuditEvent
        {
            EventType = "USER_PASSWORD_RESET_INITIATED",
            ActorUserId = actorUserId,
            ActorRole = "PmwSuperAdmin",
            TargetEntityId = id.ToString(),
            TargetEntityType = nameof(Employee),
            ActionDescription = $"Admin initiated password reset for {user.FullName} ({user.SapId}). Temporary token generated.",
            Timestamp = DateTime.UtcNow
        };
        _db.AuditEvents.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Password reset token generated.", resetToken, employeeName = user.FullName });
    }
}

public record CreateUserDto(
    string SapId,
    string FullName,
    string? Email,
    string Grade,
    string Designation,
    string? Location,
    string ReportingGroup,
    string? Division,
    string? WingDepartment,
    string? RegionBranch,
    string AssignedRole,
    string ActorUserId = "SUPER_ADMIN"
);
