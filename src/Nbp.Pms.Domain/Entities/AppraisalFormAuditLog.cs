namespace Nbp.Pms.Domain.Entities;

public class AppraisalFormAuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeCycleId { get; set; }
    public EmployeeCycle? EmployeeCycle { get; set; }

    public string ActionType { get; set; } = string.Empty; // e.g. "SCORE_CHANGED", "KPI_ADDED", "COMMENT_ADDED"
    public string TargetItemTitle { get; set; } = string.Empty; // e.g. "Commercial Portfolio Disbursement"
    public string FieldName { get; set; } = string.Empty; // e.g. "AppraiserRating", "AchievementDetails", "AppraiserComments"
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }

    public string PerformedBySapId { get; set; } = string.Empty;
    public string PerformedByName { get; set; } = string.Empty;
    public string PerformedByRole { get; set; } = string.Empty; // "Employee", "FirstAppraiser", "SecondAppraiser", "PmwAdmin"
    public string WorkflowStage { get; set; } = string.Empty; // "ObjectiveDraft", "FirstAppraiserAssessment", etc.

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
