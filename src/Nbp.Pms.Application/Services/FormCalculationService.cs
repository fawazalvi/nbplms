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
            // For KPI Form, weightages are fixed: 70% Objectives + 30% Behavioural Traits.
            // Individual objective scores are averaged automatically, so weightage allocation is fixed for all staff.
            return new FormValidationResult(true, "Fixed KPI Form structure: 70% Objectives Average + 30% Behavioural Traits Average = 100% Composite Score.");
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
    /// For KPI Form:
    /// - Objectives Average Rating = (Sum of Objective Ratings) / (Count of Objectives) [1.0 to 5.0 scale]
    /// - Behaviour Traits Average Rating = (Sum of Trait Ratings) / (Count of Traits) [1.0 to 5.0 scale]
    /// - Objectives Decimal Contribution (70%) = Objectives Average * 0.70 [Max 3.50]
    /// - Behaviour Traits Decimal Contribution (30%) = Traits Average * 0.30 [Max 1.50]
    /// - Final Composite Decimal Score = Objectives Contribution + Traits Contribution [1.0 to 5.0 scale]
    /// </summary>
    public Score CalculateAndEncryptScore(
        Guid employeeCycleId,
        List<Objective> objectives,
        List<BehaviourTrait> traits,
        string? appraiserComments = null,
        int keyVersion = 1,
        FormType formType = FormType.KpiForm
    )
    {
        decimal objScoreSum = 0;
        decimal traitScoreSum = 0;
        decimal finalScore = 0;

        bool isKpi = formType == FormType.KpiForm || traits.Count > 0;

        if (isKpi)
        {
            // 1. Average of individual objectives (1.0 - 5.0 decimal scale)
            var validObjs = objectives.Where(o => (o.SecondAppraiserRating ?? (o.RequiresCoAppraiserReview ? o.CoAppraiserRating : null) ?? o.FirstAppraiserRating ?? o.EmployeeSelfRating).HasValue).ToList();
            decimal avgObjRating = validObjs.Any()
                ? (decimal)validObjs.Average(o => (o.SecondAppraiserRating ?? (o.RequiresCoAppraiserReview ? (o.CoAppraiserRating ?? o.FirstAppraiserRating) : (o.FirstAppraiserRating ?? o.CoAppraiserRating)) ?? o.EmployeeSelfRating)!.Value)
                : (objectives.Any() ? 3.0m : 0m);

            // 2. Average of behaviour traits (1.0 - 5.0 decimal scale)
            var validTraits = traits.Where(t => t.FirstAppraiserRating.HasValue).ToList();
            decimal avgTraitRating = validTraits.Any()
                ? (decimal)validTraits.Average(t => t.FirstAppraiserRating!.Value)
                : (traits.Any() ? 4.0m : 0m);

            // 3. 70% Objectives + 30% Behaviour Traits (Decimal score on 5.00 scale)
            objScoreSum = Math.Round(avgObjRating * 0.70m, 2);
            traitScoreSum = Math.Round(avgTraitRating * 0.30m, 2);
            finalScore = Math.Round(objScoreSum + traitScoreSum, 2);
        }
        else
        {
            // BSC / Risk-Adjusted BSC Form with perspective weightages summing to 100% (on 5.00 decimal scale)
            decimal totalWeightage = objectives.Sum(o => o.WeightagePercentage);
            if (totalWeightage >= 99.0m && totalWeightage <= 101.0m)
            {
                foreach (var obj in objectives)
                {
                    var rating = obj.SecondAppraiserRating ?? (obj.RequiresCoAppraiserReview ? (obj.CoAppraiserRating ?? obj.FirstAppraiserRating) : (obj.FirstAppraiserRating ?? obj.CoAppraiserRating)) ?? obj.EmployeeSelfRating ?? 3;
                    objScoreSum += rating * (obj.WeightagePercentage / 100.0m);
                }
            }
            else
            {
                // Group by perspective key and calculate weighted perspective contributions
                var perspectives = new[]
                {
                    new { Key = "fin", Weight = formType == FormType.RiskAdjustedBsc ? 0.25m : 0.30m },
                    new { Key = "cust", Weight = formType == FormType.RiskAdjustedBsc ? 0.20m : 0.25m },
                    new { Key = "proc", Weight = formType == FormType.RiskAdjustedBsc ? 0.20m : 0.25m },
                    new { Key = "learn", Weight = formType == FormType.RiskAdjustedBsc ? 0.15m : 0.20m },
                    new { Key = "risk", Weight = formType == FormType.RiskAdjustedBsc ? 0.20m : 0.00m },
                };

                foreach (var p in perspectives)
                {
                    if (p.Weight <= 0) continue;
                    var pObjs = objectives.Where(o => (o.Perspective?.Name ?? o.Title ?? "").ToLower().Contains(p.Key)).ToList();
                    decimal pAvg = 4.0m;
                    if (pObjs.Any())
                    {
                        pAvg = (decimal)pObjs.Average(o => (o.SecondAppraiserRating ?? (o.RequiresCoAppraiserReview ? (o.CoAppraiserRating ?? o.FirstAppraiserRating) : (o.FirstAppraiserRating ?? o.CoAppraiserRating)) ?? o.EmployeeSelfRating ?? 3));
                    }
                    objScoreSum += pAvg * p.Weight;
                }
            }
            objScoreSum = Math.Round(objScoreSum, 2);
            traitScoreSum = 0;
            finalScore = Math.Round(objScoreSum, 2);
        }

        var ratingLevel = AssignRatingLevel(finalScore);

        // AES-256-GCM Field Encryption for Database Secrecy
        string encObjScore = _encryptionService.Encrypt(objScoreSum.ToString("F2"), keyVersion);
        string encTraitScore = _encryptionService.Encrypt(traitScoreSum.ToString("F2"), keyVersion);
        string encFinalScore = _encryptionService.Encrypt(finalScore.ToString("F2"), keyVersion);
        string commentToEncrypt = !string.IsNullOrWhiteSpace(appraiserComments)
            ? appraiserComments
            : $"Final Composite Decimal Score: {finalScore:F2} / 5.00 ({ratingLevel})";
        string encComments = _encryptionService.Encrypt(commentToEncrypt, keyVersion);

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
            >= 4.50m => RatingLevel.Outstanding,
            >= 3.80m => RatingLevel.VeryGood,
            >= 3.00m => RatingLevel.Good,
            >= 2.00m => RatingLevel.NeedsImprovement,
            _ => RatingLevel.Unsatisfactory
        };
    }
}
