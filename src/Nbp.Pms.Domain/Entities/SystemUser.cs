namespace Nbp.Pms.Domain.Entities;

public class SystemUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Username { get; set; } // SAP ID or admin username
    public required string PasswordHash { get; set; } // BCrypt hashed
    public required string FullName { get; set; }
    public string? Email { get; set; }
    public required string Role { get; set; } // PmwSuperAdmin, PmwAdmin, GroupPerformanceManager, Employee, FirstAppraiser, SecondAppraiser, Auditor, SystemSupport

    // Link to Employee record (null for pure admin accounts)
    public Guid? EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsLockedOut { get; set; } = false;
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LastLoginAt { get; set; }
    public bool MustChangePassword { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
