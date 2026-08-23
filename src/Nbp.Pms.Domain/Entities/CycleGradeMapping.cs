using System;

namespace Nbp.Pms.Domain.Entities;

public class CycleGradeMapping
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CycleId { get; set; }
    public string EsgCode { get; set; } = string.Empty; // 2-digit code e.g. "01".."09"
    public string GradeCode { get; set; } = string.Empty; // e.g. "OG_III", "VP"
    public string GradeName { get; set; } = string.Empty; // e.g. "Officer Grade III", "Vice President"
    public int HierarchyOrder { get; set; }
    public string DefaultFormType { get; set; } = "KPI_FORM"; // "KPI_FORM", "BALANCED_SCORECARD", "RISK_ADJUSTED_BSC"
    public DateTime SnapshottedAt { get; set; } = DateTime.UtcNow;
    public string SnapshottedBy { get; set; } = "PMW_ADMIN";
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation property
    public virtual AppraisalCycle Cycle { get; set; } = null!;
}
