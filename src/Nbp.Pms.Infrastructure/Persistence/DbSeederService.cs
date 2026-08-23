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

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ReportingGroups' AND COLUMN_NAME = 'RpsaCode')
                BEGIN
                    ALTER TABLE ReportingGroups ADD RpsaCode NVARCHAR(10) NULL;
                -- Deduplicate ReportingGroups keeping latest
                WITH CTE_Groups AS (
                    SELECT Id, GroupCode, RpsaCode, ROW_NUMBER() OVER(PARTITION BY GroupCode ORDER BY CASE WHEN RpsaCode IS NOT NULL AND RpsaCode <> '' THEN 1 ELSE 2 END, CreatedAt DESC) as rn
                    FROM ReportingGroups
                )
                DELETE FROM ReportingGroups WHERE Id IN (SELECT Id FROM CTE_Groups WHERE rn > 1);

                -- Deduplicate GradeMappings keeping latest
                WITH CTE_Grades AS (
                    SELECT Id, GradeCode, EsgCode, ROW_NUMBER() OVER(PARTITION BY GradeCode ORDER BY CreatedAt DESC) as rn
                    FROM GradeMappings
                )
                DELETE FROM GradeMappings WHERE Id IN (SELECT Id FROM CTE_Grades WHERE rn > 1);

                UPDATE ReportingGroups SET RpsaCode = '0001' WHERE GroupCode = 'CBG' AND (RpsaCode IS NULL OR RpsaCode = '');
                UPDATE ReportingGroups SET RpsaCode = '0002' WHERE GroupCode = 'RBG' AND (RpsaCode IS NULL OR RpsaCode = '');
                UPDATE ReportingGroups SET RpsaCode = '0003' WHERE GroupCode = 'RMG' AND (RpsaCode IS NULL OR RpsaCode = '');
                UPDATE ReportingGroups SET RpsaCode = '0004' WHERE GroupCode = 'TGM' AND (RpsaCode IS NULL OR RpsaCode = '');
                UPDATE ReportingGroups SET RpsaCode = '0005' WHERE GroupCode = 'ITG' AND (RpsaCode IS NULL OR RpsaCode = '');
                UPDATE ReportingGroups SET RpsaCode = '0006' WHERE GroupCode = 'OPS' AND (RpsaCode IS NULL OR RpsaCode = '');
                UPDATE ReportingGroups SET RpsaCode = '0007' WHERE GroupCode = 'HRG' AND (RpsaCode IS NULL OR RpsaCode = '');
                UPDATE ReportingGroups SET RpsaCode = '0008' WHERE GroupCode = 'CMP' AND (RpsaCode IS NULL OR RpsaCode = '');

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GradeMappings' AND COLUMN_NAME = 'EsgCode')
                BEGIN
                    ALTER TABLE GradeMappings ADD EsgCode NVARCHAR(10) NULL;
                END

                EXEC('
                    UPDATE GradeMappings SET EsgCode = ''01'' WHERE (GradeCode = ''PRESIDENT'' OR GradeCode = ''PRESIDENT_CEO'');
                    UPDATE GradeMappings SET EsgCode = ''02'' WHERE GradeCode = ''SEVP'';
                    UPDATE GradeMappings SET EsgCode = ''03'' WHERE GradeCode = ''EVP'';
                    UPDATE GradeMappings SET EsgCode = ''04'' WHERE GradeCode = ''SVP'';
                    UPDATE GradeMappings SET EsgCode = ''05'' WHERE GradeCode = ''VP'';
                    UPDATE GradeMappings SET EsgCode = ''06'' WHERE GradeCode = ''AVP'';
                    UPDATE GradeMappings SET EsgCode = ''07'' WHERE GradeCode = ''OG_I'';
                    UPDATE GradeMappings SET EsgCode = ''08'' WHERE GradeCode = ''OG_II'';
                    UPDATE GradeMappings SET EsgCode = ''09'' WHERE GradeCode = ''OG_III'';

                    -- Convert Employees Grade to ESG code & ReportingGroup to RPSA code
                    UPDATE Employees SET Grade = ''01'' WHERE Grade IN (''President/CEO'', ''PRESIDENT'', ''PRESIDENT_CEO'', ''President & CEO'');
                    UPDATE Employees SET Grade = ''02'' WHERE Grade = ''SEVP'';
                    UPDATE Employees SET Grade = ''03'' WHERE Grade = ''EVP'';
                    UPDATE Employees SET Grade = ''04'' WHERE Grade = ''SVP'';
                    UPDATE Employees SET Grade = ''05'' WHERE Grade = ''VP'';
                    UPDATE Employees SET Grade = ''06'' WHERE Grade IN (''AVP'', ''Assistant Vice President'');
                    UPDATE Employees SET Grade = ''07'' WHERE Grade IN (''OG I'', ''OG_I'', ''Officer Grade I'', ''Officer Grade 1'');
                    UPDATE Employees SET Grade = ''08'' WHERE Grade IN (''OG II'', ''OG_II'', ''Officer Grade II'', ''Officer Grade 2'');
                    UPDATE Employees SET Grade = ''09'' WHERE Grade IN (''OG III'', ''OG_III'', ''Officer Grade III'', ''Officer Grade 3'');

                    UPDATE Employees SET ReportingGroup = ''0001'' WHERE ReportingGroup LIKE ''%Commercial%'' OR ReportingGroup = ''CBG'' OR ReportingGroup = ''Executive Office'';
                    UPDATE Employees SET ReportingGroup = ''0002'' WHERE ReportingGroup LIKE ''%Consumer%'' OR ReportingGroup = ''RBG'' OR ReportingGroup LIKE ''%Retail%'';
                    UPDATE Employees SET ReportingGroup = ''0003'' WHERE ReportingGroup LIKE ''%Risk%'' OR ReportingGroup = ''RMG'';
                    UPDATE Employees SET ReportingGroup = ''0004'' WHERE ReportingGroup LIKE ''%Treasury%'' OR ReportingGroup = ''TGM'';
                    UPDATE Employees SET ReportingGroup = ''0005'' WHERE ReportingGroup LIKE ''%Technology%'' OR ReportingGroup = ''ITG'';
                    UPDATE Employees SET ReportingGroup = ''0006'' WHERE ReportingGroup LIKE ''%Operations%'' OR ReportingGroup = ''OPS'';
                    UPDATE Employees SET ReportingGroup = ''0007'' WHERE ReportingGroup LIKE ''%HR%'' OR ReportingGroup = ''HRG'';
                    UPDATE Employees SET ReportingGroup = ''0008'' WHERE ReportingGroup LIKE ''%Compliance%'' OR ReportingGroup = ''CMP'';

                    -- Convert EmployeeCycles SnapshotGrade to ESG code & SnapshotReportingGroup to RPSA code
                    UPDATE EmployeeCycles SET SnapshotGrade = ''01'' WHERE SnapshotGrade IN (''President/CEO'', ''PRESIDENT'', ''PRESIDENT_CEO'', ''President & CEO'');
                    UPDATE EmployeeCycles SET SnapshotGrade = ''02'' WHERE SnapshotGrade = ''SEVP'';
                    UPDATE EmployeeCycles SET SnapshotGrade = ''03'' WHERE SnapshotGrade = ''EVP'';
                    UPDATE EmployeeCycles SET SnapshotGrade = ''04'' WHERE SnapshotGrade = ''SVP'';
                    UPDATE EmployeeCycles SET SnapshotGrade = ''05'' WHERE SnapshotGrade = ''VP'';
                    UPDATE EmployeeCycles SET SnapshotGrade = ''06'' WHERE SnapshotGrade IN (''AVP'', ''Assistant Vice President'');
                    UPDATE EmployeeCycles SET SnapshotGrade = ''07'' WHERE SnapshotGrade IN (''OG I'', ''OG_I'', ''Officer Grade I'', ''Officer Grade 1'');
                    UPDATE EmployeeCycles SET SnapshotGrade = ''08'' WHERE SnapshotGrade IN (''OG II'', ''OG_II'', ''Officer Grade II'', ''Officer Grade 2'');
                    UPDATE EmployeeCycles SET SnapshotGrade = ''09'' WHERE SnapshotGrade IN (''OG III'', ''OG_III'', ''Officer Grade III'', ''Officer Grade 3'');

                    UPDATE EmployeeCycles SET SnapshotReportingGroup = ''0001'' WHERE SnapshotReportingGroup LIKE ''%Commercial%'' OR SnapshotReportingGroup = ''CBG'' OR SnapshotReportingGroup = ''Executive Office'';
                    UPDATE EmployeeCycles SET SnapshotReportingGroup = ''0002'' WHERE SnapshotReportingGroup LIKE ''%Consumer%'' OR SnapshotReportingGroup = ''RBG'' OR SnapshotReportingGroup LIKE ''%Retail%'';
                    UPDATE EmployeeCycles SET SnapshotReportingGroup = ''0003'' WHERE SnapshotReportingGroup LIKE ''%Risk%'' OR SnapshotReportingGroup = ''RMG'';
                    UPDATE EmployeeCycles SET SnapshotReportingGroup = ''0004'' WHERE SnapshotReportingGroup LIKE ''%Treasury%'' OR SnapshotReportingGroup = ''TGM'';
                    UPDATE EmployeeCycles SET SnapshotReportingGroup = ''0005'' WHERE SnapshotReportingGroup LIKE ''%Technology%'' OR SnapshotReportingGroup = ''ITG'';
                    UPDATE EmployeeCycles SET SnapshotReportingGroup = ''0006'' WHERE SnapshotReportingGroup LIKE ''%Operations%'' OR SnapshotReportingGroup = ''OPS'';
                    UPDATE EmployeeCycles SET SnapshotReportingGroup = ''0007'' WHERE SnapshotReportingGroup LIKE ''%HR%'' OR SnapshotReportingGroup = ''HRG'';
                    UPDATE EmployeeCycles SET SnapshotReportingGroup = ''0008'' WHERE SnapshotReportingGroup LIKE ''%Compliance%'' OR SnapshotReportingGroup = ''CMP'';
                ');

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'EmployeeCycles' AND COLUMN_NAME = 'SnapshotGrade')
                BEGIN
                    ALTER TABLE EmployeeCycles ADD SnapshotGrade NVARCHAR(50) NULL;
                    ALTER TABLE EmployeeCycles ADD SnapshotDesignation NVARCHAR(255) NULL;
                    ALTER TABLE EmployeeCycles ADD SnapshotReportingGroup NVARCHAR(255) NULL;
                    ALTER TABLE EmployeeCycles ADD SnapshotDivision NVARCHAR(255) NULL;
                    ALTER TABLE EmployeeCycles ADD SnapshotWingDepartment NVARCHAR(255) NULL;
                    ALTER TABLE EmployeeCycles ADD SnapshotRegionBranch NVARCHAR(255) NULL;
                    ALTER TABLE EmployeeCycles ADD SnapshotLocation NVARCHAR(255) NULL;
                    ALTER TABLE EmployeeCycles ADD SnapshotIsMrtOrMrc BIT NULL;
                END

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SystemUsers')
                BEGIN
                    CREATE TABLE SystemUsers (
                        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                        Username NVARCHAR(100) NOT NULL,
                        PasswordHash NVARCHAR(500) NOT NULL,
                        FullName NVARCHAR(255) NOT NULL,
                        Email NVARCHAR(255) NULL,
                        Role NVARCHAR(50) NOT NULL DEFAULT 'Employee',
                        EmployeeId UNIQUEIDENTIFIER NULL,
                        IsActive BIT NOT NULL DEFAULT 1,
                        IsLockedOut BIT NOT NULL DEFAULT 0,
                        FailedLoginAttempts INT NOT NULL DEFAULT 0,
                        LastLoginAt DATETIME2 NULL,
                        MustChangePassword BIT NOT NULL DEFAULT 1,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        UpdatedAt DATETIME2 NULL,
                        CONSTRAINT FK_SystemUsers_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(Id) ON DELETE SET NULL
                    );
                    CREATE UNIQUE INDEX IX_SystemUsers_Username ON SystemUsers(Username);
                END

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmailConfigurations')
                BEGIN
                    CREATE TABLE EmailConfigurations (
                        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                        ProviderType NVARCHAR(50) NOT NULL DEFAULT 'SMTP',
                        Host NVARCHAR(255) NOT NULL DEFAULT 'mailhog',
                        Port INT NOT NULL DEFAULT 1025,
                        EncryptionType NVARCHAR(50) NOT NULL DEFAULT 'None',
                        RequireAuthentication BIT NOT NULL DEFAULT 0,
                        Username NVARCHAR(255) NULL,
                        Password NVARCHAR(500) NULL,
                        SenderEmail NVARCHAR(255) NOT NULL DEFAULT 'pms-notifications@nbp.com.pk',
                        SenderDisplayName NVARCHAR(255) NOT NULL DEFAULT 'NBP Performance Management System',
                        ReplyToEmail NVARCHAR(255) NULL,
                        IsActive BIT NOT NULL DEFAULT 1,
                        LastTestedAt DATETIME2 NULL,
                        LastTestStatus NVARCHAR(50) NULL,
                        LastTestError NVARCHAR(MAX) NULL,
                        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        UpdatedByUserId NVARCHAR(100) NULL
                    );
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
        if (await _db.EmailConfigurations.AnyAsync()) _db.EmailConfigurations.RemoveRange(_db.EmailConfigurations);
        if (await _db.SystemUsers.AnyAsync()) _db.SystemUsers.RemoveRange(_db.SystemUsers);
        if (await _db.Employees.AnyAsync()) _db.Employees.RemoveRange(_db.Employees);
        if (await _db.KeyVersions.AnyAsync()) _db.KeyVersions.RemoveRange(_db.KeyVersions);

        await _db.SaveChangesAsync();
    }

    public async Task SeedDatabaseAsync()
    {
        // First ensure schema has all required tables and physical columns
        await MigrateDatabaseSchemaAsync();

        // Ensure default system accounts (admin, pmwadmin, employee portal accounts) always exist
        await EnsureDefaultUsersAsync();

        // Avoid duplicate master data seeding
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

        // 2. Reporting Groups with 4-Digit Leading-Zero RPSA Codes
        if (!await _db.ReportingGroups.AnyAsync())
        {
            var groups = new List<ReportingGroup>
            {
                new ReportingGroup { GroupCode = "CBG", GroupName = "Commercial Banking Group", RpsaCode = "0001" },
                new ReportingGroup { GroupCode = "RBG", GroupName = "Consumer Banking Group", RpsaCode = "0002" },
                new ReportingGroup { GroupCode = "RMG", GroupName = "Risk Management Group", RpsaCode = "0003" },
                new ReportingGroup { GroupCode = "TGM", GroupName = "Treasury & Global Markets", RpsaCode = "0004" },
                new ReportingGroup { GroupCode = "ITG", GroupName = "Information Technology Group", RpsaCode = "0005" },
                new ReportingGroup { GroupCode = "OPS", GroupName = "Operations Group", RpsaCode = "0006" },
                new ReportingGroup { GroupCode = "HRG", GroupName = "HR Management Group", RpsaCode = "0007" },
                new ReportingGroup { GroupCode = "CMP", GroupName = "Compliance Group", RpsaCode = "0008" },
            };
            _db.ReportingGroups.AddRange(groups);
        }

        // 3. Grade Mappings
        if (!await _db.GradeMappings.AnyAsync())
        {
            var grades = new List<GradeMapping>
            {
                new GradeMapping { GradeCode = "OG_III", GradeName = "OG III", EsgCode = "09", RankOrder = 1, DefaultFormType = "KPI_FORM" },
                new GradeMapping { GradeCode = "OG_II", GradeName = "OG II", EsgCode = "08", RankOrder = 2, DefaultFormType = "KPI_FORM" },
                new GradeMapping { GradeCode = "OG_I", GradeName = "OG I", EsgCode = "07", RankOrder = 3, DefaultFormType = "KPI_FORM" },
                new GradeMapping { GradeCode = "AVP", GradeName = "AVP", EsgCode = "06", RankOrder = 4, DefaultFormType = "KPI_FORM" },
                new GradeMapping { GradeCode = "VP", GradeName = "VP", EsgCode = "05", RankOrder = 5, DefaultFormType = "BALANCED_SCORECARD" },
                new GradeMapping { GradeCode = "SVP", GradeName = "SVP", EsgCode = "04", RankOrder = 6, DefaultFormType = "BALANCED_SCORECARD" },
                new GradeMapping { GradeCode = "EVP", GradeName = "EVP", EsgCode = "03", RankOrder = 7, DefaultFormType = "BALANCED_SCORECARD" },
                new GradeMapping { GradeCode = "SEVP", GradeName = "SEVP", EsgCode = "02", RankOrder = 8, DefaultFormType = "BALANCED_SCORECARD" },
                new GradeMapping { GradeCode = "PRESIDENT", GradeName = "President/CEO", EsgCode = "01", RankOrder = 9, DefaultFormType = "BALANCED_SCORECARD" },
            };
            _db.GradeMappings.AddRange(grades);
        }

        // 4. Employees (Grades stored as 2-digit ESG codes "01"-"09", Groups stored as 4-digit RPSA codes "0001"-"0008")
        var pres = new Employee
        {
            SapId = "10001",
            FullName = "Rahmat Ali Hasnie",
            Grade = "01", // President/CEO
            Designation = "President & CEO",
            Location = "Head Office Karachi",
            ReportingGroup = "0001", // Commercial / Executive
            Division = "Executive",
            WingDepartment = "President Office",
            RegionBranch = "Head Office",
            IsMrtOrMrc = true
        };

        var sevp = new Employee
        {
            SapId = "10002",
            FullName = "Asad Mumtaz",
            Grade = "02", // SEVP
            Designation = "Group Chief",
            Location = "Head Office Karachi",
            ReportingGroup = "0001", // Commercial Banking Group
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
            Grade = "04", // SVP
            Designation = "Divisional Head",
            Location = "Head Office Karachi",
            ReportingGroup = "0001", // Commercial Banking Group
            Division = "Corporate & Commercial",
            WingDepartment = "Commercial Division",
            RegionBranch = "Head Office",
            FirstAppraiser = sevp
        };

        var vp = new Employee
        {
            SapId = "10004",
            FullName = "Tariq Mahmood",
            Grade = "05", // VP
            Designation = "Regional Head",
            Location = "Karachi Region",
            ReportingGroup = "0001", // Commercial Banking Group
            Division = "Commercial Banking",
            WingDepartment = "Regional Office",
            RegionBranch = "Karachi Central",
            FirstAppraiser = svp
        };

        var avp = new Employee
        {
            SapId = "84920",
            FullName = "Fawaz Ahmed",
            Grade = "06", // AVP
            Designation = "Senior Relationship Manager",
            Location = "Karachi Region",
            ReportingGroup = "0001", // Commercial Banking Group
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
            Grade = "07", // OG I
            Designation = "Relationship Manager",
            Location = "Karachi Region",
            ReportingGroup = "0001", // Commercial Banking Group
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
            Grade = "08", // OG II
            Designation = "Operations Officer",
            Location = "Lahore Region",
            ReportingGroup = "0002", // Consumer Banking Group
            Division = "Retail Operations",
            WingDepartment = "Branch Operations",
            RegionBranch = "Lahore Main",
            FirstAppraiser = vp
        };

        var mrtAvp = new Employee
        {
            SapId = "76210",
            FullName = "Usman Farooq",
            Grade = "06", // AVP
            Designation = "Senior Risk Analyst",
            Location = "Head Office Karachi",
            ReportingGroup = "0003", // Risk Management Group
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

        // 6. EmployeeCycle for Fawaz Ahmed (AVP "06" in 2026 Cycle, Group "0001")
        var empCycleFawaz = new EmployeeCycle
        {
            Employee = avp,
            Cycle = cycle2026,
            AssignedFormType = FormType.KpiForm,
            CurrentStatus = WorkflowStatus.AnnualReviewSelfAssessment,
            SnapshotGrade = "06", // AVP
            SnapshotDesignation = "Assistant Vice President",
            SnapshotReportingGroup = "0001", // Commercial Banking Group
            SnapshotDivision = "Corporate Banking",
            SnapshotWingDepartment = "Relationship Management",
            SnapshotRegionBranch = "Karachi Main",
            SnapshotLocation = "Head Office Karachi",
            SnapshotIsMrtOrMrc = false,
            FirstAppraiser = vp,
            SecondAppraiser = svp,
            AppraiserValidationStatus = "Validated"
        };

        // 6b. Historical 2025 Cycle for Fawaz Ahmed (OG I "07" in Consumer Banking Group "0002"!)
        var empCycleFawaz2025 = new EmployeeCycle
        {
            Employee = avp,
            Cycle = cycle2025,
            AssignedFormType = FormType.KpiForm,
            CurrentStatus = WorkflowStatus.CycleClosed,
            SnapshotGrade = "07", // OG I
            SnapshotDesignation = "Senior Operations Officer",
            SnapshotReportingGroup = "0002", // Consumer Banking Group
            SnapshotDivision = "Retail Operations",
            SnapshotWingDepartment = "Branch Services",
            SnapshotRegionBranch = "Lahore Main",
            SnapshotLocation = "Lahore",
            SnapshotIsMrtOrMrc = false,
            FirstAppraiser = vp,
            SecondAppraiser = svp,
            AppraiserValidationStatus = "Validated",
            CreatedAt = new DateTime(2025, 1, 15)
        };

        _db.EmployeeCycles.AddRange(empCycleFawaz, empCycleFawaz2025);

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

        // A. BehaviourTraits
        var bt1 = new BehaviourTrait {
            EmployeeCycleId = empCycleFawaz.Id,
            TraitName = "Integrity & Ethical Conduct",
            Definition = "Demonstrates honesty, transparency and adherence to NBP's code of conduct and regulatory requirements.",
            WeightagePercentage = 6.0m,
            FirstAppraiserRating = 4
        };
        var bt2 = new BehaviourTrait {
            EmployeeCycleId = empCycleFawaz.Id,
            TraitName = "Teamwork & Collaboration",
            Definition = "Works cooperatively with colleagues, shares knowledge and contributes to team objectives.",
            WeightagePercentage = 6.0m,
            FirstAppraiserRating = 4
        };
        var bt3 = new BehaviourTrait {
            EmployeeCycleId = empCycleFawaz.Id,
            TraitName = "Communication & Interpersonal Skills",
            Definition = "Communicates effectively with clients, team members and stakeholders at all levels.",
            WeightagePercentage = 6.0m,
            FirstAppraiserRating = 3
        };
        var bt4 = new BehaviourTrait {
            EmployeeCycleId = empCycleFawaz.Id,
            TraitName = "Initiative & Innovation",
            Definition = "Proactively identifies opportunities, proposes solutions and drives continuous improvement.",
            WeightagePercentage = 6.0m,
            FirstAppraiserRating = 4
        };
        var bt5 = new BehaviourTrait {
            EmployeeCycleId = empCycleFawaz.Id,
            TraitName = "Customer Focus & Service Excellence",
            Definition = "Prioritizes customer needs, resolves issues promptly and maintains high service standards.",
            WeightagePercentage = 6.0m,
            FirstAppraiserRating = 5
        };
        _db.BehaviourTraits.AddRange(bt1, bt2, bt3, bt4, bt5);

        // B. EmployeeCycles for OTHER employees with Snapshot attributes
        var zahidCycle = new EmployeeCycle {
            Employee = og1,
            Cycle = cycle2026,
            AssignedFormType = FormType.KpiForm,
            CurrentStatus = WorkflowStatus.ObjectiveDraft,
            SnapshotGrade = "07", // OG I
            SnapshotDesignation = "Operations Officer",
            SnapshotReportingGroup = "0001", // Commercial Banking Group
            SnapshotDivision = "Operations Division",
            SnapshotLocation = "Karachi",
            SnapshotIsMrtOrMrc = false,
            FirstAppraiser = avp,
            SecondAppraiser = vp,
            AppraiserValidationStatus = "Validated"
        };
        var mariamCycle = new EmployeeCycle {
            Employee = og2,
            Cycle = cycle2026,
            AssignedFormType = FormType.KpiForm,
            CurrentStatus = WorkflowStatus.ObjectiveDraft,
            SnapshotGrade = "08", // OG II
            SnapshotDesignation = "Customer Services Officer",
            SnapshotReportingGroup = "0001", // Commercial Banking Group
            SnapshotDivision = "Retail Services",
            SnapshotLocation = "Karachi",
            SnapshotIsMrtOrMrc = false,
            FirstAppraiser = vp,
            AppraiserValidationStatus = "Validated"
        };
        var tariqCycle = new EmployeeCycle {
            Employee = vp,
            Cycle = cycle2026,
            AssignedFormType = FormType.BalancedScorecard,
            CurrentStatus = WorkflowStatus.AnnualReviewSelfAssessment,
            SnapshotGrade = "05", // VP
            SnapshotDesignation = "Vice President / Regional Head",
            SnapshotReportingGroup = "0001", // Commercial Banking Group
            SnapshotDivision = "Corporate Banking",
            SnapshotLocation = "Karachi",
            SnapshotIsMrtOrMrc = false,
            FirstAppraiser = svp,
            SecondAppraiser = sevp,
            AppraiserValidationStatus = "Validated"
        };
        var usmanCycle = new EmployeeCycle {
            Employee = mrtAvp,
            Cycle = cycle2026,
            AssignedFormType = FormType.RiskAdjustedBsc,
            CurrentStatus = WorkflowStatus.AnnualReviewSelfAssessment,
            SnapshotGrade = "06", // AVP
            SnapshotDesignation = "Chief Market Risk Analyst",
            SnapshotReportingGroup = "0003", // Risk Management Group
            SnapshotDivision = "Risk Assessment Division",
            SnapshotLocation = "Head Office Karachi",
            SnapshotIsMrtOrMrc = true,
            FirstAppraiser = svp,
            SecondAppraiser = sevp,
            AppraiserValidationStatus = "Validated"
        };
        _db.EmployeeCycles.AddRange(zahidCycle, mariamCycle, tariqCycle, usmanCycle);

        // C. Objectives for Zahid (og1)
        var zahidObj1 = new Objective {
            EmployeeCycleId = zahidCycle.Id,
            Title = "Trade Finance Processing",
            TargetDescription = "Process 150+ Letters of Credit and Bank Guarantees with zero discrepancy rate.",
            WeightagePercentage = 25.0m
        };
        var zahidObj2 = new Objective {
            EmployeeCycleId = zahidCycle.Id,
            Title = "Customer Onboarding",
            TargetDescription = "Onboard 50 new commercial clients with complete KYC documentation.",
            WeightagePercentage = 25.0m
        };
        var zahidObj3 = new Objective {
            EmployeeCycleId = zahidCycle.Id,
            Title = "Regulatory Compliance",
            TargetDescription = "Maintain 100% compliance with SBP AML/CFT regulations.",
            WeightagePercentage = 20.0m
        };
        _db.Objectives.AddRange(zahidObj1, zahidObj2, zahidObj3);

        // D. DevelopmentReview for Fawaz
        var fawazDev = new DevelopmentReview {
            EmployeeCycleId = empCycleFawaz.Id,
            KeyStrengths = "Demonstrates exceptional credit risk evaluation skills with consistent portfolio quality maintenance. Strong relationship management capabilities with key corporate clients. Effective digital banking advocacy driving client migration to NBP digital platforms.",
            DevelopmentAreas = "Leadership and mentoring skills need further development for future management roles. Technical knowledge of international trade finance instruments can be deepened.",
            TrainingActionPlan = "1. Enroll in NBP Staff College Advanced Credit Certification program.\n2. Complete cross-training attachment in International Trade Finance Division (Q3 2026).\n3. Attend SBP-mandated Risk Management workshop.\n4. Participate in NBP Leadership Development Programme (LDP) for AVP-grade officers.",
            IsSubmitted = true,
            SubmittedByUserId = avp.Id
        };
        _db.DevelopmentReviews.Add(fawazDev);

        // E. DisagreementCase for Zahid
        var zahidDisagreement = new DisagreementCase {
            EmployeeCycleId = zahidCycle.Id,
            EmployeeId = og1.Id,
            MandatoryDisagreementReason = "I believe my NPL recovery efforts (PKR 45M recovered) were not adequately reflected in the final rating. The recovery target was PKR 30M and I exceeded it by 50%.",
            Status = "PendingGpmReview"
        };
        _db.DisagreementCases.Add(zahidDisagreement);

        var ae1 = new AuditEvent { EventType = "EMPLOYEE_IMPORTED", ActorUserId = "SYSTEM", ActorRole = "System", TargetEntityType = "Employee", ActionDescription = "Imported employee Zahid Hussain", IpAddress = "127.0.0.1", Timestamp = DateTime.UtcNow.AddDays(-10) };
        var ae2 = new AuditEvent { EventType = "CYCLE_OPENED", ActorUserId = "ADMIN", ActorRole = "PmwSuperAdmin", TargetEntityType = "AppraisalCycle", ActionDescription = "Opened 2026 cycle", IpAddress = "127.0.0.1", Timestamp = DateTime.UtcNow.AddDays(-5) };
        var ae3 = new AuditEvent { EventType = "APPRAISER_MAPPING_CONFIRMED", ActorUserId = "10004", ActorRole = "FirstAppraiser", TargetEntityType = "EmployeeCycle", ActionDescription = "Confirmed mapping for Fawaz", IpAddress = "127.0.0.1", Timestamp = DateTime.UtcNow.AddDays(-4) };
        var ae4 = new AuditEvent { EventType = "SELF_ASSESSMENT_SUBMITTED", ActorUserId = "84920", ActorRole = "Employee", TargetEntityType = "EmployeeCycle", ActionDescription = "Fawaz submitted self assessment", IpAddress = "127.0.0.1", Timestamp = DateTime.UtcNow.AddDays(-3) };
        var ae5 = new AuditEvent { EventType = "DISAGREEMENT_RAISED", ActorUserId = "91204", ActorRole = "Employee", TargetEntityType = "DisagreementCase", ActionDescription = "Zahid raised disagreement", IpAddress = "127.0.0.1", Timestamp = DateTime.UtcNow.AddDays(-1) };
        _db.AuditEvents.AddRange(ae1, ae2, ae3, ae4, ae5);

        // SystemUsers and Portal Accounts are seeded by EnsureDefaultUsersAsync() below

        // 8. Email Configuration (Default Dev / SMTP setup)
        var defaultEmailConfig = new EmailConfiguration
        {
            ProviderType = "MailHog",
            Host = "mailhog",
            Port = 1025,
            EncryptionType = "None",
            RequireAuthentication = false,
            Username = null,
            Password = null,
            SenderEmail = "pms-notifications@nbp.com.pk",
            SenderDisplayName = "NBP Performance Management System",
            ReplyToEmail = "hr-support@nbp.com.pk",
            IsActive = true,
            LastTestedAt = DateTime.UtcNow,
            LastTestStatus = "Success",
            LastTestError = null,
            UpdatedAt = DateTime.UtcNow,
            UpdatedByUserId = "SYSTEM_ADMIN"
        };
        _db.EmailConfigurations.Add(defaultEmailConfig);

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

        await EnsureDefaultUsersAsync();
    }

    public async Task EnsureSuperAdminOnlyAsync()
    {
        await MigrateDatabaseSchemaAsync();
        if (!await _db.SystemUsers.AnyAsync(u => u.Username.ToLower() == "admin"))
        {
            _db.SystemUsers.Add(new SystemUser
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@Nbp2026!"),
                FullName = "System Administrator (PMW SuperAdmin)",
                Email = "admin@nbp.com.pk",
                Role = "PmwSuperAdmin",
                IsActive = true,
                IsLockedOut = false,
                MustChangePassword = false,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }
    }

    private async Task EnsureDefaultUsersAsync()
    {
        if (!await _db.SystemUsers.AnyAsync(u => u.Username.ToLower() == "admin"))
        {
            _db.SystemUsers.Add(new SystemUser
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@Nbp2026!"),
                FullName = "System Administrator (PMW SuperAdmin)",
                Email = "admin@nbp.com.pk",
                Role = "PmwSuperAdmin",
                IsActive = true,
                IsLockedOut = false,
                MustChangePassword = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (!await _db.SystemUsers.AnyAsync(u => u.Username.ToLower() == "pmwadmin"))
        {
            _db.SystemUsers.Add(new SystemUser
            {
                Username = "pmwadmin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@Nbp2026!"),
                FullName = "PMW Central Administrator",
                Email = "pmwadmin@nbp.com.pk",
                Role = "PmwAdmin",
                IsActive = true,
                IsLockedOut = false,
                MustChangePassword = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        var employees = await _db.Employees.ToListAsync();
        foreach (var emp in employees)
        {
            if (!await _db.SystemUsers.AnyAsync(u => u.Username == emp.SapId))
            {
                string role = emp.Grade switch
                {
                    "President/CEO" => "PmwSuperAdmin",
                    "SEVP" => "PmwAdmin",
                    _ => "EndUser"
                };

                _db.SystemUsers.Add(new SystemUser
                {
                    Username = emp.SapId,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword($"Nbp{emp.SapId}!"),
                    FullName = emp.FullName,
                    Email = emp.Email ?? $"{emp.SapId}@nbp.com.pk",
                    Role = role,
                    IsActive = true,
                    IsLockedOut = false,
                    MustChangePassword = false,
                    EmployeeId = emp.Id,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync();
    }

    #region Individual Entity Seeding & Cleaning

    public async Task<int> SeedReportingGroupsAsync()
    {
        await MigrateDatabaseSchemaAsync();
        var existingCodes = await _db.ReportingGroups.Select(g => g.GroupCode).ToListAsync();
        var defaultGroups = new List<ReportingGroup>
        {
            new ReportingGroup { GroupCode = "CBG", GroupName = "Commercial Banking Group", RpsaCode = "0001" },
            new ReportingGroup { GroupCode = "RBG", GroupName = "Consumer Banking Group", RpsaCode = "0002" },
            new ReportingGroup { GroupCode = "RMG", GroupName = "Risk Management Group", RpsaCode = "0003" },
            new ReportingGroup { GroupCode = "TGM", GroupName = "Treasury & Global Markets", RpsaCode = "0004" },
            new ReportingGroup { GroupCode = "ITG", GroupName = "Information Technology Group", RpsaCode = "0005" },
            new ReportingGroup { GroupCode = "OPS", GroupName = "Operations Group", RpsaCode = "0006" },
            new ReportingGroup { GroupCode = "HRG", GroupName = "HR Management Group", RpsaCode = "0007" },
            new ReportingGroup { GroupCode = "CMP", GroupName = "Compliance Group", RpsaCode = "0008" },
        };

        int added = 0;
        foreach (var g in defaultGroups)
        {
            if (!existingCodes.Contains(g.GroupCode, StringComparer.OrdinalIgnoreCase))
            {
                _db.ReportingGroups.Add(g);
                added++;
            }
        }

        await _db.SaveChangesAsync();
        return added;
    }

    public async Task<int> CleanReportingGroupsAsync()
    {
        var count = await _db.ReportingGroups.CountAsync();
        if (count > 0)
        {
            _db.ReportingGroups.RemoveRange(_db.ReportingGroups);
            await _db.SaveChangesAsync();
        }
        return count;
    }

    public async Task<int> SeedGradeMappingsAsync()
    {
        await MigrateDatabaseSchemaAsync();
        var existingCodes = await _db.GradeMappings.Select(g => g.GradeCode).ToListAsync();
        var defaultGrades = new List<GradeMapping>
        {
            new GradeMapping { GradeCode = "OG_III", GradeName = "OG III", EsgCode = "09", RankOrder = 1, DefaultFormType = "KPI_FORM" },
            new GradeMapping { GradeCode = "OG_II", GradeName = "OG II", EsgCode = "08", RankOrder = 2, DefaultFormType = "KPI_FORM" },
            new GradeMapping { GradeCode = "OG_I", GradeName = "OG I", EsgCode = "07", RankOrder = 3, DefaultFormType = "KPI_FORM" },
            new GradeMapping { GradeCode = "AVP", GradeName = "AVP", EsgCode = "06", RankOrder = 4, DefaultFormType = "KPI_FORM" },
            new GradeMapping { GradeCode = "VP", GradeName = "VP", EsgCode = "05", RankOrder = 5, DefaultFormType = "BALANCED_SCORECARD" },
            new GradeMapping { GradeCode = "SVP", GradeName = "SVP", EsgCode = "04", RankOrder = 6, DefaultFormType = "BALANCED_SCORECARD" },
            new GradeMapping { GradeCode = "EVP", GradeName = "EVP", EsgCode = "03", RankOrder = 7, DefaultFormType = "BALANCED_SCORECARD" },
            new GradeMapping { GradeCode = "SEVP", GradeName = "SEVP", EsgCode = "02", RankOrder = 8, DefaultFormType = "BALANCED_SCORECARD" },
            new GradeMapping { GradeCode = "PRESIDENT", GradeName = "President/CEO", EsgCode = "01", RankOrder = 9, DefaultFormType = "BALANCED_SCORECARD" },
        };

        int added = 0;
        foreach (var g in defaultGrades)
        {
            if (!existingCodes.Contains(g.GradeCode, StringComparer.OrdinalIgnoreCase))
            {
                _db.GradeMappings.Add(g);
                added++;
            }
        }

        await _db.SaveChangesAsync();
        return added;
    }

    public async Task<int> CleanGradeMappingsAsync()
    {
        var count = await _db.GradeMappings.CountAsync();
        if (count > 0)
        {
            _db.GradeMappings.RemoveRange(_db.GradeMappings);
            await _db.SaveChangesAsync();
        }
        return count;
    }

    public async Task<int> SeedEmployeesAsync()
    {
        await MigrateDatabaseSchemaAsync();
        var existingSaps = await _db.Employees.Select(e => e.SapId).ToListAsync();

        var pres = new Employee
        {
            SapId = "10001",
            FullName = "Rahmat Ali Hasnie",
            Grade = "01",
            Designation = "President & CEO",
            Location = "Head Office Karachi",
            ReportingGroup = "0001",
            Division = "Executive",
            WingDepartment = "President Office",
            RegionBranch = "Head Office",
            IsMrtOrMrc = true
        };

        var sevp = new Employee
        {
            SapId = "10002",
            FullName = "Asad Mumtaz",
            Grade = "02",
            Designation = "Group Chief",
            Location = "Head Office Karachi",
            ReportingGroup = "0001",
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
            Grade = "04",
            Designation = "Divisional Head",
            Location = "Head Office Karachi",
            ReportingGroup = "0001",
            Division = "Corporate & Commercial",
            WingDepartment = "Commercial Division",
            RegionBranch = "Head Office",
            FirstAppraiser = sevp
        };

        var vp = new Employee
        {
            SapId = "10004",
            FullName = "Tariq Mahmood",
            Grade = "05",
            Designation = "Regional Head",
            Location = "Karachi Region",
            ReportingGroup = "0001",
            Division = "Commercial Banking",
            WingDepartment = "Regional Office",
            RegionBranch = "Karachi Central",
            FirstAppraiser = svp
        };

        var avp = new Employee
        {
            SapId = "84920",
            FullName = "Fawaz Ahmed",
            Grade = "06",
            Designation = "Senior Relationship Manager",
            Location = "Karachi Region",
            ReportingGroup = "0001",
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
            Grade = "07",
            Designation = "Relationship Manager",
            Location = "Karachi Region",
            ReportingGroup = "0001",
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
            Grade = "08",
            Designation = "Operations Officer",
            Location = "Lahore Region",
            ReportingGroup = "0002",
            Division = "Retail Operations",
            WingDepartment = "Branch Operations",
            RegionBranch = "Lahore Main",
            FirstAppraiser = vp
        };

        var mrtAvp = new Employee
        {
            SapId = "76210",
            FullName = "Usman Farooq",
            Grade = "06",
            Designation = "Senior Risk Analyst",
            Location = "Head Office Karachi",
            ReportingGroup = "0003",
            Division = "Credit Risk",
            WingDepartment = "Risk Assessment",
            RegionBranch = "Head Office",
            IsMrtOrMrc = true,
            FirstAppraiser = svp
        };

        var defaultEmps = new List<Employee> { pres, sevp, svp, vp, avp, og1, og2, mrtAvp };
        int added = 0;
        foreach (var emp in defaultEmps)
        {
            if (!existingSaps.Contains(emp.SapId))
            {
                _db.Employees.Add(emp);
                added++;
            }
        }

        await _db.SaveChangesAsync();
        await EnsureDefaultUsersAsync();
        return added;
    }

    public async Task<int> CleanEmployeesAsync()
    {
        // Must clean dependent scores, forms, cycles first
        if (await _db.Scores.AnyAsync()) _db.Scores.RemoveRange(_db.Scores);
        if (await _db.Objectives.AnyAsync()) _db.Objectives.RemoveRange(_db.Objectives);
        if (await _db.BehaviourTraits.AnyAsync()) _db.BehaviourTraits.RemoveRange(_db.BehaviourTraits);
        if (await _db.DevelopmentReviews.AnyAsync()) _db.DevelopmentReviews.RemoveRange(_db.DevelopmentReviews);
        if (await _db.DisagreementCases.AnyAsync()) _db.DisagreementCases.RemoveRange(_db.DisagreementCases);
        if (await _db.EmployeeCycles.AnyAsync()) _db.EmployeeCycles.RemoveRange(_db.EmployeeCycles);
        
        var count = await _db.Employees.CountAsync();
        if (count > 0)
        {
            _db.Employees.RemoveRange(_db.Employees);
            await _db.SaveChangesAsync();
        }
        return count;
    }

    public async Task<int> SeedAppraisalCyclesAsync()
    {
        await MigrateDatabaseSchemaAsync();
        var existingTitles = await _db.AppraisalCycles.Select(c => c.Title).ToListAsync();

        int added = 0;
        if (!existingTitles.Any(t => t.Contains("2026")))
        {
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
            _db.AppraisalCycles.Add(cycle2026);
            added++;
        }

        if (!existingTitles.Any(t => t.Contains("2027")))
        {
            var cycle2027 = new AppraisalCycle
            {
                Title = "Annual Appraisal Cycle 2027",
                CircularReference = "NBP/HR/2027/001",
                StartDate = new DateTime(2027, 1, 1),
                EndDate = new DateTime(2027, 12, 31),
                AcknowledgementDeadline = new DateTime(2027, 12, 20),
                Status = WorkflowStatus.CycleDraft,
                MultipleActiveCyclesAllowed = true
            };
            _db.AppraisalCycles.Add(cycle2027);
            added++;
        }

        await _db.SaveChangesAsync();
        return added;
    }

    public async Task<int> CleanAppraisalCyclesAsync()
    {
        if (await _db.Scores.AnyAsync()) _db.Scores.RemoveRange(_db.Scores);
        if (await _db.Objectives.AnyAsync()) _db.Objectives.RemoveRange(_db.Objectives);
        if (await _db.BehaviourTraits.AnyAsync()) _db.BehaviourTraits.RemoveRange(_db.BehaviourTraits);
        if (await _db.DevelopmentReviews.AnyAsync()) _db.DevelopmentReviews.RemoveRange(_db.DevelopmentReviews);
        if (await _db.DisagreementCases.AnyAsync()) _db.DisagreementCases.RemoveRange(_db.DisagreementCases);
        if (await _db.EmployeeCycles.AnyAsync()) _db.EmployeeCycles.RemoveRange(_db.EmployeeCycles);
        if (await _db.CycleReportingGroups.AnyAsync()) _db.CycleReportingGroups.RemoveRange(_db.CycleReportingGroups);
        if (await _db.CycleGradeMappings.AnyAsync()) _db.CycleGradeMappings.RemoveRange(_db.CycleGradeMappings);
        if (await _db.BellCurvePolicies.AnyAsync()) _db.BellCurvePolicies.RemoveRange(_db.BellCurvePolicies);

        var count = await _db.AppraisalCycles.CountAsync();
        if (count > 0)
        {
            _db.AppraisalCycles.RemoveRange(_db.AppraisalCycles);
            await _db.SaveChangesAsync();
        }
        return count;
    }

    public async Task<int> SeedFormTemplatesAsync()
    {
        await MigrateDatabaseSchemaAsync();
        if (await _db.FormTemplates.AnyAsync()) return 0;

        var kpiTemplate = new FormTemplate
        {
            Title = "Standard KPI & Behavioural Appraisal Form (AVP & Below)",
            FormType = FormType.KpiForm,
            TargetGradeGroup = "AVP & Below",
            Perspectives = new List<Perspective>
            {
                new Perspective { Name = "Key Performance Objectives", WeightagePercentage = 70.0m, DisplayOrder = 1 },
                new Perspective { Name = "Core Behavioural Competencies", WeightagePercentage = 30.0m, DisplayOrder = 2 }
            }
        };

        var bscTemplate = new FormTemplate
        {
            Title = "NBP Balanced Scorecard Form (VP & Above)",
            FormType = FormType.BalancedScorecard,
            TargetGradeGroup = "VP & Above",
            Perspectives = new List<Perspective>
            {
                new Perspective { Name = "Financial Perspective", WeightagePercentage = 30.0m, DisplayOrder = 1 },
                new Perspective { Name = "Customer & Market Focus", WeightagePercentage = 25.0m, DisplayOrder = 2 },
                new Perspective { Name = "Internal Processes & Compliance", WeightagePercentage = 25.0m, DisplayOrder = 3 },
                new Perspective { Name = "Learning & Organizational Growth", WeightagePercentage = 20.0m, DisplayOrder = 4 }
            }
        };

        _db.FormTemplates.AddRange(kpiTemplate, bscTemplate);
        await _db.SaveChangesAsync();
        return 2;
    }

    public async Task<int> CleanFormTemplatesAsync()
    {
        if (await _db.Objectives.AnyAsync()) _db.Objectives.RemoveRange(_db.Objectives);
        if (await _db.BehaviourTraits.AnyAsync()) _db.BehaviourTraits.RemoveRange(_db.BehaviourTraits);
        if (await _db.Perspectives.AnyAsync()) _db.Perspectives.RemoveRange(_db.Perspectives);
        
        var count = await _db.FormTemplates.CountAsync();
        if (count > 0)
        {
            _db.FormTemplates.RemoveRange(_db.FormTemplates);
            await _db.SaveChangesAsync();
        }
        return count;
    }

    public async Task<int> SeedSystemUsersAsync()
    {
        await EnsureDefaultUsersAsync();
        return await _db.SystemUsers.CountAsync();
    }

    public async Task<int> CleanSystemUsersAsync()
    {
        // Delete all non-admin users, keeping superadmin
        var nonAdminUsers = await _db.SystemUsers.Where(u => u.Username != "admin" && u.Username != "pmwadmin").ToListAsync();
        int count = nonAdminUsers.Count;
        if (count > 0)
        {
            _db.SystemUsers.RemoveRange(nonAdminUsers);
            await _db.SaveChangesAsync();
        }
        return count;
    }

    public async Task<int> CleanAuditEventsAsync()
    {
        if (await _db.AppraisalFormAuditLogs.AnyAsync()) _db.AppraisalFormAuditLogs.RemoveRange(_db.AppraisalFormAuditLogs);
        var count = await _db.AuditEvents.CountAsync();
        if (count > 0)
        {
            _db.AuditEvents.RemoveRange(_db.AuditEvents);
            await _db.SaveChangesAsync();
        }
        return count;
    }

    public async Task<int> SeedEmailConfigAsync()
    {
        await MigrateDatabaseSchemaAsync();
        if (await _db.EmailConfigurations.AnyAsync()) return 0;

        var config = new EmailConfiguration
        {
            ProviderType = "SMTP",
            Host = "mailhog",
            Port = 1025,
            EncryptionType = "None",
            RequireAuthentication = false,
            SenderEmail = "pms-notifications@nbp.com.pk",
            SenderDisplayName = "NBP Performance Management System",
            ReplyToEmail = "pms-support@nbp.com.pk",
            IsActive = true,
            UpdatedAt = DateTime.UtcNow
        };
        _db.EmailConfigurations.Add(config);
        await _db.SaveChangesAsync();
        return 1;
    }

    public async Task<int> CleanEmailConfigAsync()
    {
        var count = await _db.EmailConfigurations.CountAsync();
        if (count > 0)
        {
            _db.EmailConfigurations.RemoveRange(_db.EmailConfigurations);
            await _db.SaveChangesAsync();
        }
        return count;
    }

    public async Task<int> SeedBellCurvePoliciesAsync()
    {
        await MigrateDatabaseSchemaAsync();
        if (await _db.BellCurvePolicies.AnyAsync()) return 0;

        var cycle = await _db.AppraisalCycles.FirstOrDefaultAsync();
        var cycleId = cycle?.Id ?? Guid.NewGuid();

        var policy1 = new BellCurvePolicy
        {
            CycleId = cycleId,
            TargetGroup = "Bank-Wide Standard",
            TargetGrade = "All Grades",
            TargetOutstandingPercentage = 10.0m,
            TargetVeryGoodPercentage = 25.0m,
            TargetGoodPercentage = 50.0m,
            TargetNeedsImprovementPercentage = 10.0m,
            TargetUnsatisfactoryPercentage = 5.0m,
            IsCompliant = true,
            UpdatedAt = DateTime.UtcNow
        };

        _db.BellCurvePolicies.Add(policy1);
        await _db.SaveChangesAsync();
        return 1;
    }

    public async Task<int> CleanBellCurvePoliciesAsync()
    {
        var count = await _db.BellCurvePolicies.CountAsync();
        if (count > 0)
        {
            _db.BellCurvePolicies.RemoveRange(_db.BellCurvePolicies);
            await _db.SaveChangesAsync();
        }
        return count;
    }

    #endregion
}
