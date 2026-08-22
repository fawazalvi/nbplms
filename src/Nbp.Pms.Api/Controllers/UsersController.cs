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
        var query = _db.SystemUsers.Include(u => u.Employee).AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
        {
            query = query.Where(u => u.Role == role);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(u =>
                u.FullName.Contains(search) ||
                u.Username.Contains(search) ||
                (u.Email != null && u.Email.Contains(search)));
        }

        var users = await query.OrderBy(u => u.FullName).Select(u => new
        {
            u.Id,
            u.Username,
            u.FullName,
            u.Email,
            u.Role,
            u.IsActive,
            u.IsLockedOut,
            u.FailedLoginAttempts,
            u.LastLoginAt,
            u.MustChangePassword,
            u.CreatedAt,
            EmployeeSapId = u.Employee != null ? u.Employee.SapId : null,
            EmployeeGrade = u.Employee != null ? u.Employee.Grade : null,
            EmployeeDesignation = u.Employee != null ? u.Employee.Designation : null,
            EmployeeGroup = u.Employee != null ? u.Employee.ReportingGroup : null,
        }).ToListAsync();

        return Ok(users);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateSystemUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.FullName))
        {
            return BadRequest(new { message = "Username and Full Name are required." });
        }

        var existing = await _db.SystemUsers.FirstOrDefaultAsync(u => u.Username == dto.Username.Trim());
        if (existing != null)
        {
            return BadRequest(new { message = $"User with username '{dto.Username}' already exists." });
        }

        // If linking to an employee, find the employee record
        Guid? employeeId = null;
        if (!string.IsNullOrWhiteSpace(dto.EmployeeSapId))
        {
            var emp = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.EmployeeSapId.Trim());
            if (emp != null)
            {
                employeeId = emp.Id;
            }
        }

        string password = dto.Password ?? $"Nbp{dto.Username}!";
        var newUser = new SystemUser
        {
            Username = dto.Username.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            FullName = dto.FullName.Trim(),
            Email = dto.Email?.Trim() ?? $"{dto.Username}@nbp.com.pk",
            Role = dto.Role ?? "Employee",
            EmployeeId = employeeId,
            IsActive = true,
            MustChangePassword = true
        };

        _db.SystemUsers.Add(newUser);

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "USER_ACCOUNT_CREATED",
            ActorUserId = dto.ActorUserId ?? "ADMIN",
            ActorRole = "PmwSuperAdmin",
            TargetEntityId = newUser.Id.ToString(),
            TargetEntityType = nameof(SystemUser),
            ActionDescription = $"Created system user '{newUser.Username}' ({newUser.FullName}) with role '{newUser.Role}'.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"User '{newUser.FullName}' ({newUser.Username}) created successfully with role '{newUser.Role}'.",
            userId = newUser.Id,
            defaultPassword = password
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateSystemUserDto dto)
    {
        var user = await _db.SystemUsers.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Email)) user.Email = dto.Email.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Role)) user.Role = dto.Role;
        user.UpdatedAt = DateTime.UtcNow;

        // If linking to a different employee
        if (dto.EmployeeSapId != null)
        {
            if (string.IsNullOrWhiteSpace(dto.EmployeeSapId))
            {
                user.EmployeeId = null;
            }
            else
            {
                var emp = await _db.Employees.FirstOrDefaultAsync(e => e.SapId == dto.EmployeeSapId.Trim());
                if (emp != null) user.EmployeeId = emp.Id;
            }
        }

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "USER_ACCOUNT_UPDATED",
            ActorUserId = dto.ActorUserId ?? "ADMIN",
            ActorRole = "PmwSuperAdmin",
            TargetEntityId = id.ToString(),
            TargetEntityType = nameof(SystemUser),
            ActionDescription = $"Updated user '{user.Username}' — Role: {user.Role}, Name: {user.FullName}.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = $"User '{user.Username}' updated successfully." });
    }

    [HttpPost("{id}/toggle-status")]
    public async Task<IActionResult> ToggleUserStatus(Guid id, [FromQuery] string actorUserId = "ADMIN")
    {
        var user = await _db.SystemUsers.FindAsync(id);
        if (user == null) return NotFound();

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = user.IsActive ? "USER_ACCOUNT_ACTIVATED" : "USER_ACCOUNT_DEACTIVATED",
            ActorUserId = actorUserId,
            ActorRole = "PmwSuperAdmin",
            TargetEntityId = id.ToString(),
            TargetEntityType = nameof(SystemUser),
            ActionDescription = $"User '{user.Username}' ({user.FullName}) status changed to {(user.IsActive ? "Active" : "Inactive")}.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = $"User status updated to {(user.IsActive ? "Active" : "Inactive")}.", isActive = user.IsActive });
    }

    [HttpPost("{id}/unlock")]
    public async Task<IActionResult> UnlockUser(Guid id, [FromQuery] string actorUserId = "ADMIN")
    {
        var user = await _db.SystemUsers.FindAsync(id);
        if (user == null) return NotFound();

        user.IsLockedOut = false;
        user.FailedLoginAttempts = 0;
        user.UpdatedAt = DateTime.UtcNow;

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "USER_ACCOUNT_UNLOCKED",
            ActorUserId = actorUserId,
            ActorRole = "PmwSuperAdmin",
            TargetEntityId = id.ToString(),
            TargetEntityType = nameof(SystemUser),
            ActionDescription = $"Unlocked user account '{user.Username}' ({user.FullName}).",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "User account unlocked successfully." });
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetUserPassword(Guid id, [FromQuery] string actorUserId = "ADMIN")
    {
        var user = await _db.SystemUsers.FindAsync(id);
        if (user == null) return NotFound();

        string tempPassword = $"Nbp{Guid.NewGuid().ToString("N")[..8]}!";
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword);
        user.MustChangePassword = true;
        user.IsLockedOut = false;
        user.FailedLoginAttempts = 0;
        user.UpdatedAt = DateTime.UtcNow;

        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = "USER_PASSWORD_RESET",
            ActorUserId = actorUserId,
            ActorRole = "PmwSuperAdmin",
            TargetEntityId = id.ToString(),
            TargetEntityType = nameof(SystemUser),
            ActionDescription = $"Password reset for '{user.Username}' ({user.FullName}) by admin.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Password reset successfully. Temporary password: {tempPassword}", tempPassword, userName = user.FullName });
    }

    [HttpGet("roles")]
    public IActionResult GetAvailableRoles()
    {
        var roles = new[]
        {
            new { value = "PmwSuperAdmin", label = "PMW Super Admin", description = "Full system access including key management" },
            new { value = "PmwAdmin", label = "PMW Admin", description = "Cycle management, bulk operations, publication" },
            new { value = "GroupPerformanceManager", label = "Group Performance Manager", description = "Manage assigned groups, bell curve, disagreements" },
            new { value = "Employee", label = "Employee", description = "Own appraisal form, objectives, acknowledgement" },
            new { value = "FirstAppraiser", label = "First Appraiser", description = "Appraise direct reports" },
            new { value = "SecondAppraiser", label = "Second Appraiser", description = "Countersign/second review" },
            new { value = "Auditor", label = "Auditor", description = "Read-only access to audit logs and forms" },
            new { value = "SystemSupport", label = "System Support", description = "Technical support, user account management" },
        };
        return Ok(roles);
    }
}

public record CreateSystemUserDto(
    string Username,
    string FullName,
    string? Email,
    string? Role,
    string? Password,
    string? EmployeeSapId,
    string? ActorUserId
);

public record UpdateSystemUserDto(
    string? FullName,
    string? Email,
    string? Role,
    string? EmployeeSapId,
    string? ActorUserId
);
