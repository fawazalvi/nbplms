namespace Nbp.Pms.Contracts.Enums;

public enum FormType
{
    KpiForm = 1,          // AVP & Below: 70% objectives + 30% fixed behavioural traits
    BalancedScorecard = 2,// VP & Above: 4-perspective Balanced Scorecard
    RiskAdjustedBsc = 3   // MRT/MRC employees: 5 perspectives (includes Risk Adjustment)
}
