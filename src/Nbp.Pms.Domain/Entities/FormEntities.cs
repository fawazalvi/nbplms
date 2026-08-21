using Nbp.Pms.Contracts.Enums;

namespace Nbp.Pms.Domain.Entities;

public class FormTemplate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Title { get; set; }
    public FormType FormType { get; set; }
    public string TargetGradeGroup { get; set; } = "AVP & Below";
    public List<Perspective> Perspectives { get; set; } = new();
    public List<BehaviourTrait> DefaultBehaviourTraits { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Perspective
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FormTemplateId { get; set; }
    public required string Name { get; set; } // Financial, Customer, Internal Process, Learning, Risk Adjustment
    public decimal WeightagePercentage { get; set; }
    public int DisplayOrder { get; set; }
}

public class Objective
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeCycleId { get; set; }
    public Guid? PerspectiveId { get; set; }
    public Perspective? Perspective { get; set; }

    public required string Title { get; set; }
    public required string TargetDescription { get; set; }
    public decimal WeightagePercentage { get; set; }

    public string? AchievementDetails { get; set; }
    public int? EmployeeSelfRating { get; set; }
    public int? FirstAppraiserRating { get; set; }
    public int? SecondAppraiserRating { get; set; }
    
    // Encrypted fields (AES-256-GCM ciphertext)
    public string? EncryptedConfidentialComments { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class BehaviourTrait
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeCycleId { get; set; }
    public required string TraitName { get; set; }
    public required string Definition { get; set; }
    public decimal WeightagePercentage { get; set; } = 30.0m / 5; // e.g. 6% per trait for 5 traits = 30%

    public int? FirstAppraiserRating { get; set; }
    public string? EncryptedConfidentialComments { get; set; }
}

public class Score
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeCycleId { get; set; }

    public decimal ObjectiveTotalScore { get; set; }
    public decimal TraitTotalScore { get; set; }
    public decimal FinalCompositeScore { get; set; }
    public RatingLevel FinalRatingLevel { get; set; }

    // Encrypted fields for DBA secrecy
    public required string EncryptedObjectiveScore { get; set; }
    public required string EncryptedTraitScore { get; set; }
    public required string EncryptedFinalScore { get; set; }
    public required string EncryptedAppraiserComments { get; set; }

    public int KeyVersion { get; set; } = 1;
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
}

public class DevelopmentReview
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeCycleId { get; set; }

    public required string KeyStrengths { get; set; }
    public required string DevelopmentAreas { get; set; }
    public required string TrainingActionPlan { get; set; }
    public string? SupervisorComments { get; set; }

    public bool IsSubmitted { get; set; } = false;
    public DateTime? SubmittedAt { get; set; }
    public Guid SubmittedByUserId { get; set; }
}

public class DisagreementCase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeCycleId { get; set; }
    public Guid EmployeeId { get; set; }
    
    public required string MandatoryDisagreementReason { get; set; }
    public string Status { get; set; } = "PendingGpmReview"; // PendingGpmReview, EscalatedPmw, Resolved
    public string? ResolutionNotes { get; set; }
    public Guid? ResolvedByUserId { get; set; }

    public DateTime RaisedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}

public class BellCurvePolicy
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CycleId { get; set; }
    public required string TargetGroup { get; set; } // Bank-wide or specific Group
    public required string TargetGrade { get; set; }

    public decimal TargetOutstandingPercentage { get; set; } = 10.0m;
    public decimal TargetVeryGoodPercentage { get; set; } = 25.0m;
    public decimal TargetGoodPercentage { get; set; } = 50.0m;
    public decimal TargetNeedsImprovementPercentage { get; set; } = 10.0m;
    public decimal TargetUnsatisfactoryPercentage { get; set; } = 5.0m;

    public bool IsCompliant { get; set; } = true;
    public string? ExceptionRationale { get; set; }
    public bool ExceptionApprovedByPmw { get; set; } = false;
    public DateTime? UpdatedAt { get; set; }
}
