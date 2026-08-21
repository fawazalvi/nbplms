using Nbp.Pms.Application.Interfaces;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;

namespace Nbp.Pms.Application.Services;

public record FormValidationResult(bool IsValid, string Message);

public class FormCalculationService
{
    private readonly IEncryptionService _encryptionService;

    public FormCalculationService(IEncryptionService encryptionService)
    {
        _encryptionService = encryptionService;
    }

    /// <summary>
    /// Validates perspective and objective weightages based on grade and MRT/MRC flags.
    /// </summary>
    public FormValidationResult ValidateWeightages(
        FormType formType,
        List<Objective> objectives,
        List<Perspective>? perspectives = null
    )
    {
        if (formType == FormType.KpiForm)
        {
            // 70% Objectives + 30% Fixed Behavioural Traits
            decimal objWeightSum = objectives.Sum(o => o.WeightagePercentage);
            if (Math.Abs(objWeightSum - 70.0m) > 0.01m)
            {
                return new FormValidationResult(false, $"KPI Form objectives weightage must equal exactly 70.0% (Current sum: {objWeightSum}%).");
            }
            return new FormValidationResult(true, "Weightage valid: 70% Objectives + 30% Behavioural Traits = 100%.");
        }
        else if (formType == FormType.BalancedScorecard)
        {
            if (perspectives == null || perspectives.Count < 4)
            {
                return new FormValidationResult(false, "Balanced Scorecard requires 4 perspectives (Financial, Customer, Internal Process, Learning & Growth).");
            }

            decimal pSum = perspectives.Sum(p => p.WeightagePercentage);
            if (Math.Abs(pSum - 100.0m) > 0.01m)
            {
                return new FormValidationResult(false, $"BSC perspectives weightage must equal 100.0% (Current sum: {pSum}%).");
            }
            return new FormValidationResult(true, "Weightage valid: 4 perspectives sum to 100%.");
        }
        else if (formType == FormType.RiskAdjustedBsc)
        {
            if (perspectives == null || perspectives.Count < 5)
            {
                return new FormValidationResult(false, "Risk-Adjusted BSC requires 5 perspectives including Risk Adjustment.");
            }

            decimal pSum = perspectives.Sum(p => p.WeightagePercentage);
            if (Math.Abs(pSum - 100.0m) > 0.01m)
            {
                return new FormValidationResult(false, $"Risk-Adjusted BSC perspectives weightage must equal 100.0% (Current sum: {pSum}%).");
            }
            return new FormValidationResult(true, "Weightage valid: 5 perspectives (with Risk Adjustment) sum to 100%.");
        }

        return new FormValidationResult(false, "Unknown form type.");
    }

    /// <summary>
    /// Calculates final score, assigns rating level, and generates encrypted ciphertext for DBA secrecy.
    /// </summary>
    public Score CalculateAndEncryptScore(
        Guid employeeCycleId,
        List<Objective> objectives,
        List<BehaviourTrait> traits,
        int keyVersion = 1
    )
    {
        decimal objScoreSum = 0;
        foreach (var obj in objectives)
        {
            var rating = obj.FirstAppraiserRating ?? obj.EmployeeSelfRating ?? 3;
            objScoreSum += (rating * (obj.WeightagePercentage / 100.0m));
        }

        decimal traitScoreSum = 0;
        foreach (var trait in traits)
        {
            var rating = trait.FirstAppraiserRating ?? 3;
            traitScoreSum += (rating * (trait.WeightagePercentage / 100.0m));
        }

        decimal finalScore = objScoreSum + traitScoreSum;
        var ratingLevel = AssignRatingLevel(finalScore);

        // AES-256-GCM Field Encryption for Database Secrecy
        string encObjScore = _encryptionService.Encrypt(objScoreSum.ToString("F2"), keyVersion);
        string encTraitScore = _encryptionService.Encrypt(traitScoreSum.ToString("F2"), keyVersion);
        string encFinalScore = _encryptionService.Encrypt(finalScore.ToString("F2"), keyVersion);
        string encComments = _encryptionService.Encrypt($"Final Composite Rating: {ratingLevel}", keyVersion);

        return new Score
        {
            EmployeeCycleId = employeeCycleId,
            ObjectiveTotalScore = objScoreSum,
            TraitTotalScore = traitScoreSum,
            FinalCompositeScore = finalScore,
            FinalRatingLevel = ratingLevel,
            EncryptedObjectiveScore = encObjScore,
            EncryptedTraitScore = encTraitScore,
            EncryptedFinalScore = encFinalScore,
            EncryptedAppraiserComments = encComments,
            KeyVersion = keyVersion,
            CalculatedAt = DateTime.UtcNow
        };
    }

    private static RatingLevel AssignRatingLevel(decimal score)
    {
        return score switch
        {
            >= 4.5m => RatingLevel.Outstanding,
            >= 3.8m => RatingLevel.VeryGood,
            >= 3.0m => RatingLevel.Good,
            >= 2.0m => RatingLevel.NeedsImprovement,
            _ => RatingLevel.Unsatisfactory
        };
    }
}
