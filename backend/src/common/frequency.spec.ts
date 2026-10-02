import { classifyFrequency } from './frequency';

describe('classifyFrequency', () => {
  it('classifies a weekly pattern', () => {
    const dates = ['2026-09-02', '2026-09-09', '2026-09-16', '2026-09-23'].map(
      (value) => new Date(`${value}T00:00:00.000Z`),
    );
    expect(classifyFrequency(dates)).toBe('WEEKLY');
  });

  it('returns insufficient data for a single transaction', () => {
    expect(classifyFrequency([new Date('2026-09-02T00:00:00.000Z')])).toBe(
      'INSUFFICIENT_DATA',
    );
  });

  it('classifies multiple purchases in a week', () => {
    const dates = ['2026-09-01', '2026-09-03', '2026-09-05', '2026-09-08'].map(
      (value) => new Date(`${value}T00:00:00.000Z`),
    );
    expect(classifyFrequency(dates)).toBe('MULTIPLE_PER_WEEK');
  });

  it('classifies an irregular history', () => {
    const dates = ['2026-01-01', '2026-04-01', '2026-08-01'].map(
      (value) => new Date(`${value}T00:00:00.000Z`),
    );
    expect(classifyFrequency(dates)).toBe('IRREGULAR');
  });
});
