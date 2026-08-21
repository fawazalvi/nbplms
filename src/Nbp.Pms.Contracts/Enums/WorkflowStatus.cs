namespace Nbp.Pms.Contracts.Enums;

public enum WorkflowStatus
{
    ObjectiveDraft = 1,
    ObjectiveSubmitted = 2,
    ObjectiveReturned = 3,
    ObjectiveApproved = 4,
    AnnualReviewSelfAssessment = 5,
    FirstAppraiserAssessment = 6,
    SecondAppraiserReview = 7,
    CoAppraiserReview = 8,
    GroupPerformanceManagerReview = 9,
    PmwFinalization = 10,
    Published = 11,
    EmployeeAgreed = 12,
    EmployeeDisagreed = 13,
    DisagreementGpmReview = 14,
    DisagreementPmwReview = 15,
    DisagreementResolved = 16,
    AdministrativelyCompleted = 17,
    
    // Cycle statuses
    CycleDraft = 100,
    CycleActive = 101,
    CycleSuspended = 102,
    CycleClosed = 103
}
