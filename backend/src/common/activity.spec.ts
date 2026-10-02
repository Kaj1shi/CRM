import { classifyActivity } from './activity';

describe('classifyActivity', () => {
  const now = new Date('2026-09-28T00:00:00.000Z');

  it('marks a recent transaction active', () => {
    expect(
      classifyActivity(new Date('2026-09-10T00:00:00.000Z'), now, 30, 90),
    ).toBe('ACTIVE');
  });

  it('marks a gap beyond the first threshold at risk', () => {
    expect(
      classifyActivity(new Date('2026-08-01T00:00:00.000Z'), now, 30, 90),
    ).toBe('AT_RISK');
  });

  it('marks a long gap or missing history dormant', () => {
    expect(
      classifyActivity(new Date('2026-01-01T00:00:00.000Z'), now, 30, 90),
    ).toBe('DORMANT');
    expect(classifyActivity(null, now, 30, 90)).toBe('DORMANT');
  });
});
