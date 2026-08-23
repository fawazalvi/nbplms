namespace Nbp.Pms.Domain.Entities;

public class ReportingGroup
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string GroupName { get; set; }
    public required string GroupCode { get; set; }
    public string? RpsaCode { get; set; } // 4-digit code with leading zeros e.g. "0001", "0012"
    public string? HeadOfGroupSapId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class GradeMapping
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string GradeCode { get; set; }
    public string? GradeNumericCode { get; set; } // 2-digit code e.g. "01", "02" with zero padding
    public required string GradeName { get; set; }
    public int RankOrder { get; set; }
    public required string DefaultFormType { get; set; } // "KPI_FORM", "BALANCED_SCORECARD"
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
