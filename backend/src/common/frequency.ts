/**
 * Purchase frequency from median gap between unique transaction dates.
 * Computed on read (not a stored source of truth). Used by clients/suppliers/reports.
 */
export type PurchaseFrequency =
  | 'MULTIPLE_PER_WEEK'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'IRREGULAR'
  | 'INSUFFICIENT_DATA';

const DAY_MS = 24 * 60 * 60 * 1000;

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

export function classifyFrequency(dates: Date[]): PurchaseFrequency {
  const uniqueDays = [
    ...new Set(dates.map((date) => date.toISOString().slice(0, 10))),
  ].sort();
  if (uniqueDays.length < 3) {
    return 'INSUFFICIENT_DATA';
  }
  const gaps: number[] = [];
  for (let index = 1; index < uniqueDays.length; index += 1) {
    const previous = Date.parse(`${uniqueDays[index - 1]}T00:00:00.000Z`);
    const current = Date.parse(`${uniqueDays[index]}T00:00:00.000Z`);
    gaps.push(Math.round((current - previous) / DAY_MS));
  }
  const gap = median(gaps);
  if (gap <= 3) return 'MULTIPLE_PER_WEEK';
  if (gap <= 9) return 'WEEKLY';
  if (gap <= 18) return 'BIWEEKLY';
  if (gap <= 40) return 'MONTHLY';
  return 'IRREGULAR';
}
