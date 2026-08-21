using Microsoft.EntityFrameworkCore;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Services;

namespace Nbp.Pms.Infrastructure.Persistence;

public class DbSeederService
{
    private readonly PmsDbContext _db;
    private readonly AesGcmEncryptionService _encryption;

    public DbSeederService(PmsDbContext db)
    {
        _db = db;
        string keyBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("NbpPerformanceManagementSystem26"));
        _encryption = new AesGcmEncryptionService(keyBase64);
    }

    /// <summary>
    /// Executes automatic SQL DDL schema migrations to create missing tables and add missing physical columns to existing SQL Server tables.
    /// </summary>
    public async Task MigrateDatabaseSchemaAsync()
    {
        try
        {
            string sql = @"
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ReportingGroups')
                BEGIN
                    CREATE TABLE ReportingGroups (
                        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                        GroupCode NVARCHAR(50) NOT NULL,
                        GroupName NVARCHAR(255) NOT NULL,
                        HeadOfGroupSapId NVARCHAR(50) NULL,
                        IsActive BIT NOT NULL DEFAULT 1,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                    );
                END

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'GradeMappings')
                BEGIN
                    CREATE TABLE GradeMappings (
                        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                        GradeCode NVARCHAR(50) NOT NULL,
                        GradeName NVARCHAR(255) NOT NULL,
                        RankOrder INT NOT NULL DEFAULT 1,
                        DefaultFormType NVARCHAR(50) NOT NULL DEFAULT 'KPI_FORM',
                        IsActive BIT NOT NULL DEFAULT 1,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                    );
                END

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AppraisalFormAuditLogs')
                BEGIN
                    CREATE TABLE AppraisalFormAuditLogs (
                        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                        EmployeeCycleId UNIQUEIDENTIFIER NOT NULL,
                        ActionType NVARCHAR(100) NOT NULL,
                        TargetItemTitle NVARCHAR(255) NOT NULL,
                        FieldName NVARCHAR(100) NOT NULL,
                        OldValue NVARCHAR(MAX) NULL,
                        NewValue NVARCHAR(MAX) NULL,
                        PerformedBySapId NVARCHAR(50) NOT NULL,
                        PerformedByName NVARCHAR(255) NOT NULL,
                        PerformedByRole NVARCHAR(50) NOT NULL,
                        WorkflowStage NVARCHAR(100) NOT NULL,
                        Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                    );
                END

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BellCurvePolicies' AND COLUMN_NAME = 'UpdatedAt')
                BEGIN
                    ALTER TABLE BellCurvePolicies ADD UpdatedAt DATETIME2 NULL;
                END

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Employees' AND COLUMN_NAME = 'IsLockedOut')
                BEGIN
                    ALTER TABLE Employees ADD IsLockedOut BIT NOT NULL DEFAULT 0;
                END

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'EmployeeCycles' AND COLUMN_NAME = 'AppraiserValidationStatus')
                BEGIN
                    ALTER TABLE EmployeeCycles ADD AppraiserValidationStatus NVARCHAR(50) NOT NULL DEFAULT 'Validated';
                    ALTER TABLE EmployeeCycles ADD PendingFirstAppraiserSapId NVARCHAR(50) NULL;
                    ALTER TABLE EmployeeCycles ADD PendingSecondAppraiserSapId NVARCHAR(50) NULL;
                    ALTER TABLE EmployeeCycles ADD PendingCoAppraiserSapId NVARCHAR(50) NULL;
                    ALTER TABLE EmployeeCycles ADD AppraiserRejectionReason NVARCHAR(1000) NULL;
                    ALTER TABLE EmployeeCycles ADD AppraiserValidatedAt DATETIME2 NULL;
                    ALTER TABLE EmployeeCycles ADD AppraiserValidatedBySapId NVARCHAR(50) NULL;
                END
            ";

            await _db.Database.ExecuteSqlRawAsync(sql);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DbSeederService] Schema Migration Note: {ex.Message}");
        }
    }

    public async Task CleanDatabaseAsync()
    {
        await MigrateDatabaseSchemaAsync();

        if (await _db.AppraisalFormAuditLogs.AnyAsync()) _db.AppraisalFormAuditLogs.RemoveRange(_db.AppraisalFormAuditLogs);
        if (await _db.ReportingGroups.AnyAsync()) _db.ReportingGroups.RemoveRange(_db.ReportingGroups);
        if (await _db.GradeMappings.AnyAsync()) _db.GradeMappings.RemoveRange(_db.GradeMappings);
        if (await _db.AuditEvents.AnyAsync()) _db.AuditEvents.RemoveRange(_db.AuditEvents);
        if (await _db.DisagreementCases.AnyAsync()) _db.DisagreementCases.RemoveRange(_db.DisagreementCases);
        if (await _db.DevelopmentReviews.AnyAsync()) _db.DevelopmentReviews.RemoveRange(_db.DevelopmentReviews);
        if (await _db.Scores.AnyAsync()) _db.Scores.RemoveRange(_db.Scores);
        if (await _db.BehaviourTraits.AnyAsync()) _db.BehaviourTraits.RemoveRange(_db.BehaviourTraits);
        if (await _db.Objectives.AnyAsync()) _db.Objectives.RemoveRange(_db.Objectives);
        if (await _db.Perspectives.AnyAsync()) _db.Perspectives.RemoveRange(_db.Perspectives);
        if (await _db.FormTemplates.AnyAsync()) _db.FormTemplates.RemoveRange(_db.FormTemplates);
        if (await _db.BellCurvePolicies.AnyAsync()) _db.BellCurvePolicies.RemoveRange(_db.BellCurvePolicies);
        if (await _db.EmployeeCycles.AnyAsync()) _db.EmployeeCycles.RemoveRange(_db.EmployeeCycles);
        if (await _db.AppraisalCycles.AnyAsync()) _db.AppraisalCycles.RemoveRange(_db.AppraisalCycles);
        if (await _db.Employees.AnyAsync()) _db.Employees.RemoveRange(_db.Employees);
        if (await _db.KeyVersions.AnyAsync()) _db.KeyVersions.RemoveRange(_db.KeyVersions);

        await _db.SaveChangesAsync();
    }

    public async Task SeedDatabaseAsync()
    {
        // First ensure schema has all required tables and physical columns
        await MigrateDatabaseSchemaAsync();

        // Avoid duplicate seeding
        if (await _db.Employees.AnyAsync())
        {
            return;
        }

        // 1. Key Version
        var keyVer = new KeyVersion
        {
            VersionNumber = 1,
            KeyReference = "kms://nbp-vault/pms-master-key-v1",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.KeyVersions.Add(keyVer);

        // 2. Reporting Groups
        var groups = new List<ReportingGroup>
        {
            new ReportingGroup { GroupCode = "CBG", GroupName = "Commercial Banking Group" },
            new ReportingGroup { GroupCode = "RBG", GroupName = "Consumer Banking Group" },
            new ReportingGroup { GroupCode = "RMG", GroupName = "Risk Management Group" },
            new ReportingGroup { GroupCode = "TGM", GroupName = "Treasury & Global Markets" },
            new ReportingGroup { GroupCode = "ITG", GroupName = "Information Technology Group" },
            new ReportingGroup { GroupCode = "OPS", GroupName = "Operations Group" },
            new ReportingGroup { GroupCode = "HRG", GroupName = "HR Management Group" },
            new ReportingGroup { GroupCode = "CMP", GroupName = "Compliance Group" },
        };
        _db.ReportingGroups.AddRange(groups);

        // 3. Grade Mappings
        var grades = new List<GradeMapping>
        {
            new GradeMapping { GradeCode = "OG_III", GradeName = "OG III", RankOrder = 1, DefaultFormType = "KPI_FORM" },
            new GradeMapping { GradeCode = "OG_II", GradeName = "OG II", RankOrder = 2, DefaultFormType = "KPI_FORM" },
            new GradeMapping { GradeCode = "OG_I", GradeName = "OG I", RankOrder = 3, DefaultFormType = "KPI_FORM" },
            new GradeMapping { GradeCode = "AVP", GradeName = "AVP", RankOrder = 4, DefaultFormType = "KPI_FORM" },
            new GradeMapping { GradeCode = "VP", GradeName = "VP", RankOrder = 5, DefaultFormType = "BALANCED_SCORECARD" },
            new GradeMapping { GradeCode = "SVP", GradeName = "SVP", RankOrder = 6, DefaultFormType = "BALANCED_SCORECARD" },
            new GradeMapping { GradeCode = "EVP", GradeName = "EVP", RankOrder = 7, DefaultFormType = "BALANCED_SCORECARD" },
            new GradeMapping { GradeCode = "SEVP", GradeName = "SEVP", RankOrder = 8, DefaultFormType = "BALANCED_SCORECARD" },
            new GradeMapping { GradeCode = "PRESIDENT", GradeName = "President/CEO", RankOrder = 9, DefaultFormType = "BALANCED_SCORECARD" },
        };
        _db.GradeMappings.AddRange(grades);

        // 4. Employees
        var pres = new Employee
        {
            SapId = "10001",
            FullName = "Rahmat Ali Hasnie",
            Grade = "President/CEO",
            Designation = "President & CEO",
            Location = "Head Office Karachi",
            ReportingGroup = "Executive Office",
            Division = "Executive",
            WingDepartment = "President Office",
            RegionBranch = "Head Office",
            IsMrtOrMrc = true
        };

        var sevp = new Employee
        {
            SapId = "10002",
            FullName = "Asad Mumtaz",
            Grade = "SEVP",
            Designation = "Group Chief",
            Location = "Head Office Karachi",
            ReportingGroup = "Commercial Banking Group",
            Division = "Commercial Banking",
            WingDepartment = "Group Chief Office",
            RegionBranch = "Head Office",
            IsMrtOrMrc = true,
            FirstAppraiser = pres
        };

        var svp = new Employee
        {
            SapId = "10003",
            FullName = "Rashid Khan",
            Grade = "SVP",
            Designation = "Divisional Head",
            Location = "Head Office Karachi",
            ReportingGroup = "Commercial Banking Group",
            Division = "Corporate & Commercial",
            WingDepartment = "Commercial Division",
            RegionBranch = "Head Office",
            FirstAppraiser = sevp
        };

        var vp = new Employee
        {
            SapId = "10004",
            FullName = "Tariq Mahmood",
            Grade = "VP",
            Designation = "Regional Head",
            Location = "Karachi Region",
            ReportingGroup = "Commercial Banking Group",
            Division = "Commercial Banking",
            WingDepartment = "Regional Office",
            RegionBranch = "Karachi Central",
            FirstAppraiser = svp
        };

        var avp = new Employee
        {
            SapId = "84920",
            FullName = "Fawaz Ahmed",
            Grade = "AVP",
            Designation = "Senior Relationship Manager",
            Location = "Karachi Region",
            ReportingGroup = "Commercial Banking Group",
            Division = "Commercial Banking",
            WingDepartment = "Commercial Branch",
            RegionBranch = "Karachi Central",
            FirstAppraiser = vp,
            SecondAppraiser = svp
        };

        var og1 = new Employee
        {
            SapId = "91204",
            FullName = "Zahid Hussain",
            Grade = "OG I",
            Designation = "Relationship Manager",
            Location = "Karachi Region",
            ReportingGroup = "Commercial Banking Group",
            Division = "Commercial Banking",
            WingDepartment = "Commercial Branch",
            RegionBranch = "Karachi Central",
            FirstAppraiser = avp,
            SecondAppraiser = vp
        };

        var og2 = new Employee
        {
            SapId = "88392",
            FullName = "Mariam Ali",
            Grade = "OG II",
            Designation = "Operations Officer",
            Location = "Lahore Region",
            ReportingGroup = "Consumer Banking Group",
            Division = "Retail Operations",
            WingDepartment = "Branch Operations",
            RegionBranch = "Lahore Main",
            FirstAppraiser = vp
        };

        var mrtAvp = new Employee
        {
            SapId = "76210",
            FullName = "Usman Farooq",
            Grade = "AVP",
            Designation = "Senior Risk Analyst",
            Location = "Head Office Karachi",
            ReportingGroup = "Risk Management Group",
            Division = "Credit Risk",
            WingDepartment = "Risk Assessment",
            RegionBranch = "Head Office",
            IsMrtOrMrc = true,
            FirstAppraiser = svp
        };

        _db.Employees.AddRange(pres, sevp, svp, vp, avp, og1, og2, mrtAvp);

        // 5. Appraisal Cycles
        var cycle2026 = new AppraisalCycle
        {
            Title = "Annual Performance Appraisal Cycle 2026",
            CircularReference = "NBP/HR/2026/041",
            StartDate = new DateTime(2026, 1, 1),
            EndDate = new DateTime(2026, 12, 31),
            AcknowledgementDeadline = new DateTime(2026, 12, 15),
            Status = WorkflowStatus.CycleActive,
            MultipleActiveCyclesAllowed = true
        };

        var cycle2025 = new AppraisalCycle
        {
            Title = "Annual Performance Appraisal Cycle 2025",
            CircularReference = "NBP/HR/2025/088",
            StartDate = new DateTime(2025, 1, 1),
            EndDate = new DateTime(2025, 12, 31),
            AcknowledgementDeadline = new DateTime(2025, 12, 20),
            Status = WorkflowStatus.CycleClosed,
            MultipleActiveCyclesAllowed = true
        };

        _db.AppraisalCycles.AddRange(cycle2026, cycle2025);

        // 6. EmployeeCycle for Fawaz Ahmed (AVP)
        var empCycleFawaz = new EmployeeCycle
        {
            Employee = avp,
            Cycle = cycle2026,
            AssignedFormType = FormType.KpiForm,
            CurrentStatus = WorkflowStatus.AnnualReviewSelfAssessment,
            FirstAppraiser = vp,
            SecondAppraiser = svp,
            AppraiserValidationStatus = "Validated"
        };

        _db.EmployeeCycles.Add(empCycleFawaz);

        // 7. Objectives for Fawaz Ahmed
        var obj1 = new Objective
        {
            EmployeeCycleId = empCycleFawaz.Id,
            Title = "Commercial Portfolio Growth",
            TargetDescription = "Achieve PKR 500 Million new commercial loan disbursements with NPL ratio under 1.5%.",
            WeightagePercentage = 25.0m,
            AchievementDetails = "Disbursed PKR 520M in commercial loans with zero default rate.",
            EmployeeSelfRating = 4,
            FirstAppraiserRating = 4,
            EncryptedConfidentialComments = _encryption.Encrypt("Strong commercial portfolio growth with clean recovery track record.")
        };

        var obj2 = new Objective
        {
            EmployeeCycleId = empCycleFawaz.Id,
            Title = "NPL Recovery & Deposit Mobilization",
            TargetDescription = "Recover PKR 40 Million non-performing loans and mobilize PKR 200M low-cost CASA deposits.",
            WeightagePercentage = 25.0m,
            AchievementDetails = "Recovered PKR 45M NPLs and mobilized PKR 220M CASA deposits.",
            EmployeeSelfRating = 5,
            FirstAppraiserRating = 4,
            EncryptedConfidentialComments = _encryption.Encrypt("Exceeded NPL recovery targets.")
        };

        var obj3 = new Objective
        {
            EmployeeCycleId = empCycleFawaz.Id,
            Title = "Digital Banking Migration",
            TargetDescription = "Migrate 85% of corporate and commercial clients to NBP Digital Portal.",
            WeightagePercentage = 20.0m,
            AchievementDetails = "Onboarded 88% of clients to NBP Digital Portal.",
            EmployeeSelfRating = 4,
            FirstAppraiserRating = 4,
            EncryptedConfidentialComments = _encryption.Encrypt("Great digital adoption drive.")
        };

        _db.Objectives.AddRange(obj1, obj2, obj3);

        // 8. Form Audit Log Records (KPI, BSC, and Risk-Adjusted BSC Form Revisions)
        var log1 = new AppraisalFormAuditLog
        {
            EmployeeCycleId = empCycleFawaz.Id,
            ActionType = "SCORE_ASSIGNED",
            TargetItemTitle = "Commercial Portfolio Growth",
            FieldName = "AppraiserRating",
            OldValue = "0",
            NewValue = "4",
            PerformedBySapId = "10004",
            PerformedByName = "Tariq Mahmood",
            PerformedByRole = "FirstAppraiser",
            WorkflowStage = "FirstAppraiserAssessment",
            Timestamp = DateTime.UtcNow.AddDays(-3)
        };

        var log2 = new AppraisalFormAuditLog
        {
            EmployeeCycleId = empCycleFawaz.Id,
            ActionType = "COMMENT_ADDED",
            TargetItemTitle = "NPL Recovery & Deposit Mobilization",
            FieldName = "AppraiserComments",
            OldValue = "",
            NewValue = "Exceeded NPL recovery targets with clean recovery track record.",
            PerformedBySapId = "10004",
            PerformedByName = "Tariq Mahmood",
            PerformedByRole = "FirstAppraiser",
            WorkflowStage = "FirstAppraiserAssessment",
            Timestamp = DateTime.UtcNow.AddDays(-2)
        };

        var log3 = new AppraisalFormAuditLog
        {
            EmployeeCycleId = empCycleFawaz.Id,
            ActionType = "BSC_FINANCIAL_SCORE",
            TargetItemTitle = "Net Interest Margin & Fee Income Growth (BSC Financial)",
            FieldName = "AppraiserRating",
            OldValue = "3",
            NewValue = "4",
            PerformedBySapId = "10003",
            PerformedByName = "Rashid Khan",
            PerformedByRole = "SecondAppraiser",
            WorkflowStage = "SecondAppraiserCountersign",
            Timestamp = DateTime.UtcNow.AddDays(-1)
        };

        var log4 = new AppraisalFormAuditLog
        {
            EmployeeCycleId = empCycleFawaz.Id,
            ActionType = "RISK_SBP_COMPLIANCE_SCORE",
            TargetItemTitle = "SBP Non-Performing Loan & Prudential Regulation Compliance (Risk BSC)",
            FieldName = "AppraiserRating",
            OldValue = "4",
            NewValue = "5",
            PerformedBySapId = "10003",
            PerformedByName = "Rashid Khan",
            PerformedByRole = "SecondAppraiser",
            WorkflowStage = "SecondAppraiserCountersign",
            Timestamp = DateTime.UtcNow.AddHours(-12)
        };

        _db.AppraisalFormAuditLogs.AddRange(log1, log2, log3, log4);

        // 9. Audit Event
        var audit1 = new AuditEvent
        {
            EventType = "SYSTEM_DATABASE_INITIAL_SEED",
            ActorUserId = "SYSTEM_ADMIN",
            ActorRole = "PmwSuperAdmin",
            TargetEntityType = "Database",
            ActionDescription = "Initial sample NBP data, reporting groups, grade mappings, and multi-form appraisal audit logs (KPI, BSC, Risk BSC) seeded into SQL Server database.",
            IpAddress = "127.0.0.1",
            Timestamp = DateTime.UtcNow
        };

        _db.AuditEvents.Add(audit1);
        await _db.SaveChangesAsync();
    }
}
