import { Prisma, ProductUnit, TransactionStatus } from '@prisma/client';
import { classifyActivity, ActivityStatus } from './activity';
import { classifyFrequency, PurchaseFrequency } from './frequency';

export type MetricRow = {
  transactionDate: Date;
  quantityKg: Prisma.Decimal | null;
  inputQuantity: Prisma.Decimal;
  inputUnit: ProductUnit;
  status: TransactionStatus;
};

function numberFrom(value: Prisma.Decimal | null | undefined): number {
  return value ? Number(value) : 0;
}

export function buildMetrics(
  rows: MetricRow[],
  now = new Date(),
  inactiveAfterDays = 30,
  dormantAfterDays = 90,
) {
  const recorded = rows.filter(
    (row) => row.status === TransactionStatus.RECORDED,
  );
  const weightRows = recorded.filter(
    (row) =>
      row.inputUnit === ProductUnit.KG || row.inputUnit === ProductUnit.TONNE,
  );
  const totalQuantityKg = weightRows.reduce(
    (sum, row) => sum + numberFrom(row.quantityKg),
    0,
  );
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const quantityThisMonthKg = weightRows
    .filter(
      (row) =>
        row.transactionDate.getUTCMonth() === month &&
        row.transactionDate.getUTCFullYear() === year,
    )
    .reduce((sum, row) => sum + numberFrom(row.quantityKg), 0);
  const quantityThisYearKg = weightRows
    .filter((row) => row.transactionDate.getUTCFullYear() === year)
    .reduce((sum, row) => sum + numberFrom(row.quantityKg), 0);
  const dates = recorded
    .map((row) => row.transactionDate)
    .sort((left, right) => left.getTime() - right.getTime());
  const last = dates.at(-1) ?? null;
  const weightCount = weightRows.length;
  return {
    totalQuantityKg: Math.round(totalQuantityKg * 1000) / 1000,
    transactionCount: recorded.length,
    averageQuantityKg: weightCount
      ? Math.round((totalQuantityKg / weightCount) * 1000) / 1000
      : 0,
    lastTransactionDate: last ? last.toISOString().slice(0, 10) : null,
    quantityThisMonthKg: Math.round(quantityThisMonthKg * 1000) / 1000,
    quantityThisYearKg: Math.round(quantityThisYearKg * 1000) / 1000,
    frequency: classifyFrequency(dates) satisfies PurchaseFrequency,
    activity: classifyActivity(
      last,
      now,
      inactiveAfterDays,
      dormantAfterDays,
    ) satisfies ActivityStatus,
  };
}
