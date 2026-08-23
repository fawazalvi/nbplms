/**
 * Standard formatters for NBP Grade (ESG) and Reporting Group (RPSA) codes & descriptions.
 */

const ESG_GRADE_MAP: Record<string, { name: string; esg: string }> = {
  '01': { name: 'President/CEO', esg: '01' },
  '1': { name: 'President/CEO', esg: '01' },
  'PRESIDENT/CEO': { name: 'President/CEO', esg: '01' },
  'PRESIDENT': { name: 'President/CEO', esg: '01' },

  '02': { name: 'SEVP', esg: '02' },
  '2': { name: 'SEVP', esg: '02' },
  'SEVP': { name: 'SEVP', esg: '02' },

  '03': { name: 'EVP', esg: '03' },
  '3': { name: 'EVP', esg: '03' },
  'EVP': { name: 'EVP', esg: '03' },

  '04': { name: 'SVP', esg: '04' },
  '4': { name: 'SVP', esg: '04' },
  'SVP': { name: 'SVP', esg: '04' },

  '05': { name: 'VP', esg: '05' },
  '5': { name: 'VP', esg: '05' },
  'VP': { name: 'VP', esg: '05' },

  '06': { name: 'AVP', esg: '06' },
  '6': { name: 'AVP', esg: '06' },
  'AVP': { name: 'AVP', esg: '06' },

  '07': { name: 'OG I', esg: '07' },
  '7': { name: 'OG I', esg: '07' },
  'OG I': { name: 'OG I', esg: '07' },
  'OG-I': { name: 'OG I', esg: '07' },
  'OG1': { name: 'OG I', esg: '07' },

  '08': { name: 'OG II', esg: '08' },
  '8': { name: 'OG II', esg: '08' },
  'OG II': { name: 'OG II', esg: '08' },
  'OG-II': { name: 'OG II', esg: '08' },
  'OG2': { name: 'OG II', esg: '08' },

  '09': { name: 'OG III', esg: '09' },
  '9': { name: 'OG III', esg: '09' },
  'OG III': { name: 'OG III', esg: '09' },
  'OG-III': { name: 'OG III', esg: '09' },
  'OG3': { name: 'OG III', esg: '09' },
};

const RPSA_GROUP_MAP: Record<string, { name: string; rpsa: string }> = {
  '0001': { name: 'Commercial Banking Group', rpsa: '0001' },
  '1': { name: 'Commercial Banking Group', rpsa: '0001' },
  'COMMERCIAL BANKING GROUP': { name: 'Commercial Banking Group', rpsa: '0001' },
  'COMMERCIAL BANKING': { name: 'Commercial Banking Group', rpsa: '0001' },
  'CBG': { name: 'Commercial Banking Group', rpsa: '0001' },

  '0002': { name: 'Consumer Banking Group', rpsa: '0002' },
  '2': { name: 'Consumer Banking Group', rpsa: '0002' },
  'CONSUMER BANKING GROUP': { name: 'Consumer Banking Group', rpsa: '0002' },
  'CONSUMER BANKING': { name: 'Consumer Banking Group', rpsa: '0002' },

  '0003': { name: 'Risk Management Group', rpsa: '0003' },
  '3': { name: 'Risk Management Group', rpsa: '0003' },
  'RISK MANAGEMENT GROUP': { name: 'Risk Management Group', rpsa: '0003' },
  'RISK MANAGEMENT': { name: 'Risk Management Group', rpsa: '0003' },
  'RMG': { name: 'Risk Management Group', rpsa: '0003' },

  '0004': { name: 'Treasury & Global Markets', rpsa: '0004' },
  '4': { name: 'Treasury & Global Markets', rpsa: '0004' },
  'TREASURY & GLOBAL MARKETS': { name: 'Treasury & Global Markets', rpsa: '0004' },
  'TREASURY': { name: 'Treasury & Global Markets', rpsa: '0004' },

  '0005': { name: 'Information Technology Group', rpsa: '0005' },
  '5': { name: 'Information Technology Group', rpsa: '0005' },
  'INFORMATION TECHNOLOGY GROUP': { name: 'Information Technology Group', rpsa: '0005' },
  'INFORMATION TECHNOLOGY': { name: 'Information Technology Group', rpsa: '0005' },
  'ITG': { name: 'Information Technology Group', rpsa: '0005' },

  '0006': { name: 'Operations Group', rpsa: '0006' },
  '6': { name: 'Operations Group', rpsa: '0006' },
  'OPERATIONS GROUP': { name: 'Operations Group', rpsa: '0006' },
  'OPERATIONS': { name: 'Operations Group', rpsa: '0006' },

  '0007': { name: 'HR Management Group', rpsa: '0007' },
  '7': { name: 'HR Management Group', rpsa: '0007' },
  'HR MANAGEMENT GROUP': { name: 'HR Management Group', rpsa: '0007' },
  'HR GROUP': { name: 'HR Management Group', rpsa: '0007' },
  'HRMG': { name: 'HR Management Group', rpsa: '0007' },

  '0008': { name: 'Compliance Group', rpsa: '0008' },
  '8': { name: 'Compliance Group', rpsa: '0008' },
  'COMPLIANCE GROUP': { name: 'Compliance Group', rpsa: '0008' },
  'COMPLIANCE': { name: 'Compliance Group', rpsa: '0008' },
};

export function formatGradeLabel(grade: string | null | undefined): string {
  if (!grade || typeof grade !== 'string') return '—';
  const clean = grade.trim();
  if (!clean) return '—';

  if (clean.includes('(ESG') || clean.includes('ESG ')) return clean;

  const key = clean.toUpperCase();
  const match = ESG_GRADE_MAP[key];
  if (match) {
    return match.name + ' (ESG ' + match.esg + ')';
  }
  return clean;
}

export function formatGroupLabel(group: string | null | undefined): string {
  if (!group || typeof group !== 'string') return '—';
  const clean = group.trim();
  if (!clean) return '—';

  if (clean.includes('(RPSA') || clean.includes('RPSA ')) return clean;

  const key = clean.toUpperCase();
  const match = RPSA_GROUP_MAP[key];
  if (match) {
    return match.name + ' (RPSA ' + match.rpsa + ')';
  }
  return clean;
}