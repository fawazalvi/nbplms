using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;

namespace Nbp.Pms.Application.Services;

public record DistributionSummary(
    int TotalAppraisals,
    int OutstandingCount,
    decimal OutstandingActualPercentage,
    int VeryGoodCount,
    decimal VeryGoodActualPercentage,
    int GoodCount,
    decimal GoodActualPercentage,
    int NeedsImprovementCount,
    decimal NeedsImprovementActualPercentage,
    int UnsatisfactoryCount,
    decimal UnsatisfactoryActualPercentage,
    bool IsWithinPolicyLimits,
    string ComplianceNotes
);

public class BellCurveEngine
{
    public DistributionSummary CalculateDistribution(List<Score> scores, BellCurvePolicy policy)
    {
        int total = scores.Count;
        if (total == 0)
        {
            return new DistributionSummary(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, true, "No completed scores in cohort.");
        }

        int outCount = scores.Count(s => s.FinalRatingLevel == RatingLevel.Outstanding);
        int vgCount = scores.Count(s => s.FinalRatingLevel == RatingLevel.VeryGood);
        int gCount = scores.Count(s => s.FinalRatingLevel == RatingLevel.Good);
        int niCount = scores.Count(s => s.FinalRatingLevel == RatingLevel.NeedsImprovement);
        int unCount = scores.Count(s => s.FinalRatingLevel == RatingLevel.Unsatisfactory);

        decimal outPct = (outCount / (decimal)total) * 100.0m;
        decimal vgPct = (vgCount / (decimal)total) * 100.0m;
        decimal gPct = (gCount / (decimal)total) * 100.0m;
        decimal niPct = (niCount / (decimal)total) * 100.0m;
        decimal unPct = (unCount / (decimal)total) * 100.0m;

        // Check variance against policy thresholds (+/- 5% variance allowance)
        bool outOk = Math.Abs(outPct - policy.TargetOutstandingPercentage) <= 5.0m;
        bool vgOk = Math.Abs(vgPct - policy.TargetVeryGoodPercentage) <= 5.0m;
        bool gOk = Math.Abs(gPct - policy.TargetGoodPercentage) <= 5.0m;

        bool isCompliant = outOk && vgOk && gOk;
        string notes = isCompliant
            ? "Distribution is compliant with target policy limits."
            : $"Distribution exceeds policy limits (Outstanding: {outPct:F1}%, Target: {policy.TargetOutstandingPercentage}%). Requires PMW exception approval.";

        return new DistributionSummary(
            total,
            outCount, Math.Round(outPct, 1),
            vgCount, Math.Round(vgPct, 1),
            gCount, Math.Round(gPct, 1),
            niCount, Math.Round(niPct, 1),
            unCount, Math.Round(unPct, 1),
            isCompliant,
            notes
        );
    }
}
