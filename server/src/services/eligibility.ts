import { EligibilityRule, GovernmentRecord } from '@prisma/client';
import { logger } from '../utils/logger';

export interface UserProfileData {
  state?: string;
  district?: string;
  ageRange?: string;
  age?: number;
  occupation?: string;
  category?: string;
  incomeRange?: string;
  income?: number;
  areaType?: string;
  gender?: string;
  familyDetails?: string;
  [key: string]: unknown;
}

export interface EligibilityResult {
  recordId: string;
  score: number;
  maxScore: number;
  percentage: number;
  label: 'likely_relevant' | 'potentially_relevant' | 'more_info_required' | 'does_not_match';
  matchReasons: string[];
  missingInfo: string[];
  failedRules: string[];
}

/**
 * Evaluate a single eligibility rule against user profile data.
 * Returns: 'match' | 'no_match' | 'unknown' (missing data)
 */
function evaluateRule(
  rule: EligibilityRule,
  profile: UserProfileData
): { result: 'match' | 'no_match' | 'unknown'; reason: string } {
  const fieldValue = profile[rule.fieldName];

  // If user hasn't provided this field, it's unknown
  if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
    return {
      result: 'unknown',
      reason: rule.description || `${rule.fieldName} information not provided`,
    };
  }

  const ruleValue = rule.value;

  try {
    switch (rule.operator) {
      case 'eq':
        if (String(fieldValue).toLowerCase() === ruleValue.toLowerCase()) {
          return { result: 'match', reason: rule.description || `${rule.fieldName} matches` };
        }
        return { result: 'no_match', reason: rule.description || `${rule.fieldName} does not match required value` };

      case 'neq':
        if (String(fieldValue).toLowerCase() !== ruleValue.toLowerCase()) {
          return { result: 'match', reason: rule.description || `${rule.fieldName} qualifies` };
        }
        return { result: 'no_match', reason: rule.description || `${rule.fieldName} is excluded` };

      case 'in': {
        const allowed = JSON.parse(ruleValue) as string[];
        const normalizedValue = String(fieldValue).toLowerCase();
        if (allowed.some(a => a.toLowerCase() === normalizedValue)) {
          return { result: 'match', reason: rule.description || `${rule.fieldName} is eligible` };
        }
        return { result: 'no_match', reason: rule.description || `${rule.fieldName} not in eligible list` };
      }

      case 'not_in': {
        const excluded = JSON.parse(ruleValue) as string[];
        const normalizedValue = String(fieldValue).toLowerCase();
        if (!excluded.some(e => e.toLowerCase() === normalizedValue)) {
          return { result: 'match', reason: rule.description || `${rule.fieldName} is not excluded` };
        }
        return { result: 'no_match', reason: rule.description || `${rule.fieldName} is excluded` };
      }

      case 'gte': {
        const numVal = parseNumericValue(fieldValue);
        const ruleNum = parseFloat(ruleValue);
        if (numVal === null) return { result: 'unknown', reason: `Cannot parse ${rule.fieldName} as a number` };
        if (numVal >= ruleNum) {
          return { result: 'match', reason: rule.description || `${rule.fieldName} meets minimum` };
        }
        return { result: 'no_match', reason: rule.description || `${rule.fieldName} below minimum` };
      }

      case 'lte': {
        const numVal = parseNumericValue(fieldValue);
        const ruleNum = parseFloat(ruleValue);
        if (numVal === null) return { result: 'unknown', reason: `Cannot parse ${rule.fieldName} as a number` };
        if (numVal <= ruleNum) {
          return { result: 'match', reason: rule.description || `${rule.fieldName} meets requirement` };
        }
        return { result: 'no_match', reason: rule.description || `${rule.fieldName} exceeds maximum` };
      }

      case 'between': {
        const [min, max] = JSON.parse(ruleValue) as [number, number];
        const numVal = parseNumericValue(fieldValue);
        if (numVal === null) return { result: 'unknown', reason: `Cannot parse ${rule.fieldName} as a number` };
        if (numVal >= min && numVal <= max) {
          return { result: 'match', reason: rule.description || `${rule.fieldName} is within range` };
        }
        return { result: 'no_match', reason: rule.description || `${rule.fieldName} is outside required range` };
      }

      case 'exists':
        return { result: 'match', reason: rule.description || `${rule.fieldName} is provided` };

      default:
        return { result: 'unknown', reason: `Unknown operator: ${rule.operator}` };
    }
  } catch (error) {
    logger.error(`Error evaluating rule ${rule.id}`, error);
    return { result: 'unknown', reason: `Error evaluating ${rule.fieldName}` };
  }
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Handle ranges like "18-25", take midpoint or first value
    const rangeMatch = value.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      return (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
    }
    // Handle "below X", "under X"
    const belowMatch = value.match(/^(?:below|under|less than)\s+(\d+)/i);
    if (belowMatch) return parseInt(belowMatch[1]) - 1;
    // Handle "above X", "over X"
    const aboveMatch = value.match(/^(?:above|over|more than)\s+(\d+)/i);
    if (aboveMatch) return parseInt(aboveMatch[1]) + 1;
    // Try direct parse
    const num = parseFloat(value.replace(/[₹,\s]/g, ''));
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Evaluate all eligibility rules for a record against user profile.
 */
export function evaluateEligibility(
  record: GovernmentRecord & { eligibilityRules: EligibilityRule[] },
  profile: UserProfileData
): EligibilityResult {
  const rules = record.eligibilityRules;
  const matchReasons: string[] = [];
  const missingInfo: string[] = [];
  const failedRules: string[] = [];

  let matchScore = 0;
  let totalWeight = 0;
  let hasHardFail = false;

  // Check geographic scope
  if (record.stateScope.length > 0 && profile.state) {
    const stateMatch = record.stateScope.some(
      s => s.toLowerCase() === profile.state!.toLowerCase()
    );
    if (stateMatch) {
      matchReasons.push('Available in your state');
      matchScore += 2;
    } else {
      failedRules.push('Not available in your state');
      hasHardFail = true;
    }
    totalWeight += 2;
  } else if (record.stateScope.length > 0 && !profile.state) {
    missingInfo.push('State information needed to confirm availability');
    totalWeight += 2;
  } else {
    matchReasons.push('Available nationwide');
    matchScore += 2;
    totalWeight += 2;
  }

  // Check beneficiary category
  if (record.beneficiaries.length > 0 && profile.category) {
    const catMatch = record.beneficiaries.some(
      b => b.toLowerCase().includes(profile.category!.toLowerCase()) ||
        profile.category!.toLowerCase().includes(b.toLowerCase())
    );
    if (catMatch) {
      matchReasons.push(`Intended for ${profile.category} beneficiaries`);
      matchScore += 3;
    } else {
      // Soft fail - beneficiary categories might not be exhaustive
      missingInfo.push('Your category may not be the primary target group');
    }
    totalWeight += 3;
  } else if (record.beneficiaries.length > 0) {
    missingInfo.push('Category information would help assess relevance');
    totalWeight += 3;
  }

  // Evaluate structured rules
  for (const rule of rules) {
    const weight = rule.isRequired ? 3 : 1;
    totalWeight += weight;

    const { result, reason } = evaluateRule(rule, profile);

    switch (result) {
      case 'match':
        matchReasons.push(reason);
        matchScore += weight;
        break;
      case 'no_match':
        if (rule.isRequired) {
          failedRules.push(reason);
          hasHardFail = true;
        } else {
          failedRules.push(reason);
        }
        break;
      case 'unknown':
        missingInfo.push(reason);
        break;
    }
  }

  // Ensure minimum total weight
  if (totalWeight === 0) totalWeight = 1;

  const percentage = Math.round((matchScore / totalWeight) * 100);

  // Determine label
  let label: EligibilityResult['label'];
  if (hasHardFail) {
    label = 'does_not_match';
  } else if (missingInfo.length > matchReasons.length) {
    label = 'more_info_required';
  } else if (percentage >= 60) {
    label = 'likely_relevant';
  } else if (percentage >= 30) {
    label = 'potentially_relevant';
  } else {
    label = 'does_not_match';
  }

  return {
    recordId: record.id,
    score: matchScore,
    maxScore: totalWeight,
    percentage,
    label,
    matchReasons,
    missingInfo,
    failedRules,
  };
}

/**
 * Score and rank multiple records against a user profile.
 */
export function rankRecords(
  records: (GovernmentRecord & { eligibilityRules: EligibilityRule[] })[],
  profile: UserProfileData
): (EligibilityResult & { record: GovernmentRecord })[] {
  return records
    .map(record => ({
      ...evaluateEligibility(record, profile),
      record,
    }))
    .filter(r => r.label !== 'does_not_match')
    .sort((a, b) => {
      // Primary: label priority
      const labelOrder = { likely_relevant: 0, potentially_relevant: 1, more_info_required: 2, does_not_match: 3 };
      const labelDiff = labelOrder[a.label] - labelOrder[b.label];
      if (labelDiff !== 0) return labelDiff;
      // Secondary: percentage score
      return b.percentage - a.percentage;
    });
}
