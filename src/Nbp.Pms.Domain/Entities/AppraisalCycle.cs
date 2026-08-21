using Nbp.Pms.Contracts.Enums;

namespace Nbp.Pms.Domain.Entities;

public class AppraisalCycle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Title { get; set; } // e.g. Annual Appraisal Cycle 2026
    public required string CircularReference { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public DateTime AcknowledgementDeadline { get; set; }
    
    public WorkflowStatus Status { get; set; } = WorkflowStatus.CycleDraft;
    public bool MultipleActiveCyclesAllowed { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
