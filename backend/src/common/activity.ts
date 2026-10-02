/**
 * Activity label from days since last txn vs settings thresholds.
 * Display-only — does not overwrite Client/Supplier.status.
 */
export type ActivityStatus = 'ACTIVE' | 'AT_RISK' | 'DORMANT';

const DAY_MS = 24 * 60 * 60 * 1000;

export function classifyActivity(
  lastTransactionDate: Date | null,
  now: Date,
  inactiveAfterDays: number,
  dormantAfterDays: number,
): ActivityStatus {
  if (!lastTransactionDate) {
    return 'DORMANT';
  }
  const elapsedDays = (now.getTime() - lastTransactionDate.getTime()) / DAY_MS;
  if (elapsedDays <= inactiveAfterDays) return 'ACTIVE';
  if (elapsedDays <= dormantAfterDays) return 'AT_RISK';
  return 'DORMANT';
}
