/**
 * Transaction quantity helpers: KG/TONNE → quantityKg; PIECE/OTHER → null kg.
 * Used when recording purchases and supplies.
 */
import { BadRequestException } from '@nestjs/common';
import { ProductUnit } from '@prisma/client';

export function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function toStoredQuantity(
  quantity: number,
  unit: ProductUnit,
): { quantityKg: number | null; inputQuantity: number; weight: boolean } {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new BadRequestException({
      message:
        'Unable to save transaction. Please check the highlighted fields.',
      errors: { quantity: 'Quantity must be greater than zero.' },
    });
  }
  const inputQuantity = roundQuantity(quantity);
  if (unit === ProductUnit.KG) {
    return { quantityKg: inputQuantity, inputQuantity, weight: true };
  }
  if (unit === ProductUnit.TONNE) {
    return {
      quantityKg: roundQuantity(inputQuantity * 1000),
      inputQuantity,
      weight: true,
    };
  }
  return { quantityKg: null, inputQuantity, weight: false };
}

export function formatWeight(quantityKg: number): string {
  if (quantityKg >= 1000) {
    const tonnes = Math.round((quantityKg / 1000) * 1000) / 1000;
    return `${tonnes} tonnes`;
  }
  return `${quantityKg} kg`;
}
