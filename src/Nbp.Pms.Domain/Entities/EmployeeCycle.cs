using Nbp.Pms.Contracts.Enums;

namespace Nbp.Pms.Domain.Entities;

public class EmployeeCycle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public Guid CycleId { get; set; }
    public AppraisalCycle? Cycle { get; set; }

    public FormType AssignedFormType { get; set; }
    public WorkflowStatus CurrentStatus { get; set; } = WorkflowStatus.ObjectiveDraft;

    public Guid? FirstAppraiserId { get; set; }
    public Employee? FirstAppraiser { get; set; }

    public Guid? SecondAppraiserId { get; set; }
    public Employee? SecondAppraiser { get; set; }

    public Guid? CoAppraiserId { get; set; }
    public Employee? CoAppraiser { get; set; }

    // Appraiser Self-Service Validation Workflow Properties
    public string AppraiserValidationStatus { get; set; } = "Validated"; // "Validated", "PendingConfirmation", "Rejected"
    public string? PendingFirstAppraiserSapId { get; set; }
    public string? PendingSecondAppraiserSapId { get; set; }
    public string? PendingCoAppraiserSapId { get; set; }
    public string? AppraiserRejectionReason { get; set; }
    public DateTime? AppraiserValidatedAt { get; set; }
    public string? AppraiserValidatedBySapId { get; set; }

    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? AcknowledgedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
