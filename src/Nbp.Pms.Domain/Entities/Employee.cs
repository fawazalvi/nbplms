namespace Nbp.Pms.Domain.Entities;

public class Employee
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string SapId { get; set; }
    public required string FullName { get; set; }
    public required string Grade { get; set; } // OG III, OG II, OG I, AVP, VP, SVP, EVP, SEVP, President/CEO
    public required string Designation { get; set; }
    public required string Location { get; set; }
    public required string ReportingGroup { get; set; }
    public required string Division { get; set; }
    public required string WingDepartment { get; set; }
    public required string RegionBranch { get; set; }
    
    public string? Email { get; set; }
    public bool IsMrtOrMrc { get; set; } // Material Risk Taker / Material Risk Controller
    public bool IsActive { get; set; } = true;
    public bool IsLockedOut { get; set; } = false;

    // Appraiser relationships
    public Guid? FirstAppraiserId { get; set; }
    public Employee? FirstAppraiser { get; set; }

    public Guid? SecondAppraiserId { get; set; }
    public Employee? SecondAppraiser { get; set; }

    public Guid? CoAppraiserId { get; set; }
    public Employee? CoAppraiser { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
