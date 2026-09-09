using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Nbp.Pms.Domain.Entities;

namespace Nbp.Pms.Application.Interfaces;

public interface IPmsDbContext
{
    DbSet<Employee> Employees { get; }
    DbSet<AppraisalCycle> AppraisalCycles { get; }
    DbSet<EmployeeCycle> EmployeeCycles { get; }
    DbSet<FormTemplate> FormTemplates { get; }
    DbSet<Perspective> Perspectives { get; }
    DbSet<Objective> Objectives { get; }
    DbSet<BehaviourTrait> BehaviourTraits { get; }
    DbSet<Score> Scores { get; }
    DbSet<DevelopmentReview> DevelopmentReviews { get; }
    DbSet<DisagreementCase> DisagreementCases { get; }
    DbSet<BellCurvePolicy> BellCurvePolicies { get; }
    DbSet<AuditEvent> AuditEvents { get; }
    DbSet<KeyVersion> KeyVersions { get; }
    DbSet<ReportingGroup> ReportingGroups { get; }
    DbSet<GradeMapping> GradeMappings { get; }
    DbSet<CycleReportingGroup> CycleReportingGroups { get; }
    DbSet<CycleGradeMapping> CycleGradeMappings { get; }
    DbSet<AppraisalFormAuditLog> AppraisalFormAuditLogs { get; }
    DbSet<SystemUser> SystemUsers { get; }
    DbSet<EmailConfiguration> EmailConfigurations { get; }
    DbSet<WorkflowNotificationConfig> WorkflowNotificationConfigs { get; }
    DbSet<Location> Locations { get; }

    EntityEntry<TEntity> Entry<TEntity>(TEntity entity) where TEntity : class;
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
