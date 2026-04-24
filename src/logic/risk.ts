import { ConflictType } from "../types";

export type RiskLevel = 'low' | 'medium' | 'high';

export type RiskAssessment = {
  risk: RiskLevel;
  recommendedAction: string;
};

/** Keywords that signal sensitive/critical code paths */
const HIGH_RISK_KEYWORDS = [
  'auth', 'password', 'passwd', 'payment', 'billing', 'stripe',
  'security', 'token', 'secret', 'api_key', 'apikey', 'credential',
  'database', 'migration', 'schema', 'core', 'critical', 'admin',
  'permission', 'role', 'encrypt', 'hash', 'wallet', 'transaction',
];

/**
 * Lightweight heuristic risk assessment.
 * Runs purely on diff content — no AI call needed.
 */
export function assessRisk(
  current: string,
  incoming: string,
  type: ConflictType
): RiskAssessment {
  const combined = (current + incoming).toLowerCase();
  const totalLines = [...current.split('\n'), ...incoming.split('\n')]
    .filter(l => l.trim().length > 0).length;

  const isHighRisk = HIGH_RISK_KEYWORDS.some(kw => combined.includes(kw));
  const isSmallDiff = totalLines <= 6;
  const isFormattingOnly = type === 'formatting';

  let risk: RiskLevel;
  if (isHighRisk) {
    risk = 'high';
  } else if (isSmallDiff || isFormattingOnly) {
    risk = 'low';
  } else {
    risk = 'medium';
  }

  const recommendedAction =
    risk === 'high'   ? 'Review carefully — touches sensitive logic' :
    risk === 'medium' ? 'Apply, then run your test suite' :
                        'Safe to apply immediately';

  return { risk, recommendedAction };
}
