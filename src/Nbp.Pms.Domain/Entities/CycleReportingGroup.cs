using System;

namespace Nbp.Pms.Domain.Entities;

public class CycleReportingGroup
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CycleId { get; set; }
    public string RpsaCode { get; set; } = string.Empty; // 4-digit code e.g. "0001"
    public string GroupCode { get; set; } = string.Empty; // e.g. "CBG"
    public string GroupName { get; set; } = string.Empty; // e.g. "Commercial Banking Group"
    public string? HeadOfGroupSapId { get; set; }
    public DateTime SnapshottedAt { get; set; } = DateTime.UtcNow;
    public string SnapshottedBy { get; set; } = "PMW_ADMIN";
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation property
    public virtual AppraisalCycle Cycle { get; set; } = null!;
}
