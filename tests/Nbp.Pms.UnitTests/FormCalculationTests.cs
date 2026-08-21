using Xunit;
using Nbp.Pms.Application.Services;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;
using Nbp.Pms.Infrastructure.Services;

namespace Nbp.Pms.UnitTests;

public class FormCalculationTests
{
    private readonly FormCalculationService _calculationService;

    public FormCalculationTests()
    {
        string testKeyBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("NbpPerformanceManagementSystem26"));
        var encryptionService = new AesGcmEncryptionService(testKeyBase64);
        _calculationService = new FormCalculationService(encryptionService);
    }

    [Fact]
    public void ValidateWeightages_KpiFormNotEqualing70PercentObjectives_ReturnsInvalid()
    {
        // Arrange
        var objectives = new List<Objective>
        {
            new Objective { Title = "Obj 1", TargetDescription = "Desc", WeightagePercentage = 40 },
            new Objective { Title = "Obj 2", TargetDescription = "Desc", WeightagePercentage = 20 } // Total 60% (Expected 70%)
        };

        // Act
        var result = _calculationService.ValidateWeightages(FormType.KpiForm, objectives);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("must equal exactly 70.0%", result.Message);
    }

    [Fact]
    public void DetermineFormType_GradeAndMrtFlags_AssignsCorrectForm()
    {
        // Assert
        Assert.Equal(FormType.KpiForm, EmployeeImportService.DetermineFormType("AVP", isMrtOrMrc: false));
        Assert.Equal(FormType.KpiForm, EmployeeImportService.DetermineFormType("OG I", isMrtOrMrc: false));
        Assert.Equal(FormType.BalancedScorecard, EmployeeImportService.DetermineFormType("VP", isMrtOrMrc: false));
        Assert.Equal(FormType.BalancedScorecard, EmployeeImportService.DetermineFormType("SVP", isMrtOrMrc: false));
        Assert.Equal(FormType.RiskAdjustedBsc, EmployeeImportService.DetermineFormType("AVP", isMrtOrMrc: true)); // MRT override
    }
}
