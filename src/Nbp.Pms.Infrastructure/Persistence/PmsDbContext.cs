using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Domain.Entities;

namespace Nbp.Pms.Infrastructure.Persistence;

public class PmsDbContext : DbContext
{
    public PmsDbContext(DbContextOptions<PmsDbContext> options) : base(options) { }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<AppraisalCycle> AppraisalCycles => Set<AppraisalCycle>();
    public DbSet<EmployeeCycle> EmployeeCycles => Set<EmployeeCycle>();
    public DbSet<FormTemplate> FormTemplates => Set<FormTemplate>();
    public DbSet<Perspective> Perspectives => Set<Perspective>();
    public DbSet<Objective> Objectives => Set<Objective>();
    public DbSet<BehaviourTrait> BehaviourTraits => Set<BehaviourTrait>();
    public DbSet<Score> Scores => Set<Score>();
    public DbSet<DevelopmentReview> DevelopmentReviews => Set<DevelopmentReview>();
    public DbSet<DisagreementCase> DisagreementCases => Set<DisagreementCase>();
    public DbSet<BellCurvePolicy> BellCurvePolicies => Set<BellCurvePolicy>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<KeyVersion> KeyVersions => Set<KeyVersion>();
    public DbSet<ReportingGroup> ReportingGroups => Set<ReportingGroup>();
    public DbSet<GradeMapping> GradeMappings => Set<GradeMapping>();
    public DbSet<AppraisalFormAuditLog> AppraisalFormAuditLogs => Set<AppraisalFormAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Employee Indexes & Unique Constraints
        modelBuilder.Entity<Employee>()
            .HasIndex(e => e.SapId)
            .IsUnique();

        modelBuilder.Entity<Employee>()
            .HasIndex(e => e.ReportingGroup);

        modelBuilder.Entity<Employee>()
            .HasIndex(e => e.Grade);

        // Explicit self-referencing appraiser relationships for Employee
        modelBuilder.Entity<Employee>()
            .HasOne(e => e.FirstAppraiser)
            .WithMany()
            .HasForeignKey(e => e.FirstAppraiserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Employee>()
            .HasOne(e => e.SecondAppraiser)
            .WithMany()
            .HasForeignKey(e => e.SecondAppraiserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Employee>()
            .HasOne(e => e.CoAppraiser)
            .WithMany()
            .HasForeignKey(e => e.CoAppraiserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Explicit appraiser relationships for EmployeeCycle
        modelBuilder.Entity<EmployeeCycle>()
            .HasIndex(ec => new { ec.CycleId, ec.EmployeeId })
            .IsUnique();

        modelBuilder.Entity<EmployeeCycle>()
            .HasOne(ec => ec.FirstAppraiser)
            .WithMany()
            .HasForeignKey(ec => ec.FirstAppraiserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<EmployeeCycle>()
            .HasOne(ec => ec.SecondAppraiser)
            .WithMany()
            .HasForeignKey(ec => ec.SecondAppraiserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<EmployeeCycle>()
            .HasOne(ec => ec.CoAppraiser)
            .WithMany()
            .HasForeignKey(ec => ec.CoAppraiserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Audit Event indexing
        modelBuilder.Entity<AuditEvent>()
            .HasIndex(a => a.ActorUserId);

        modelBuilder.Entity<AuditEvent>()
            .HasIndex(a => a.EventType);

        modelBuilder.Entity<AuditEvent>()
            .HasIndex(a => a.Timestamp);

        modelBuilder.Entity<AppraisalFormAuditLog>()
            .HasIndex(al => al.EmployeeCycleId);

        // Encrypted field configurations
        modelBuilder.Entity<Score>()
            .Property(s => s.EncryptedFinalScore)
            .HasMaxLength(2000);

        modelBuilder.Entity<Score>()
            .Property(s => s.EncryptedObjectiveScore)
            .HasMaxLength(2000);

        modelBuilder.Entity<Score>()
            .Property(s => s.EncryptedTraitScore)
            .HasMaxLength(2000);

        modelBuilder.Entity<Score>()
            .Property(s => s.EncryptedAppraiserComments)
            .HasMaxLength(4000);
    }
}
