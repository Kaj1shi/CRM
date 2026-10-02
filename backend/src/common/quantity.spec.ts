import { BadRequestException } from '@nestjs/common';
import { ProductUnit } from '@prisma/client';
import { formatWeight, toStoredQuantity } from './quantity';

describe('toStoredQuantity', () => {
  it('keeps kilograms unchanged', () => {
    expect(toStoredQuantity(500, ProductUnit.KG).quantityKg).toBe(500);
  });

  it('converts tonnes to kilograms', () => {
    expect(toStoredQuantity(2.5, ProductUnit.TONNE).quantityKg).toBe(2500);
    expect(toStoredQuantity(1, ProductUnit.TONNE).quantityKg).toBe(1000);
  });

  it('does not convert pieces into kilograms', () => {
    expect(toStoredQuantity(12, ProductUnit.PIECE).quantityKg).toBeNull();
  });

  it('rejects zero, negative, and malformed quantities', () => {
    expect(() => toStoredQuantity(0, ProductUnit.KG)).toThrow(
      BadRequestException,
    );
    expect(() => toStoredQuantity(-5, ProductUnit.KG)).toThrow(
      BadRequestException,
    );
    expect(() => toStoredQuantity(Number.NaN, ProductUnit.KG)).toThrow(
      BadRequestException,
    );
  });
});

describe('formatWeight', () => {
  it('displays large weights in tonnes', () => {
    expect(formatWeight(42500)).toBe('42.5 tonnes');
  });
});
