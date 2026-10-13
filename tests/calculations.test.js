import { describe, it, expect } from 'vitest';
import { rollingAverage, groupByWeek, computeAdaptiveTDEE, logsInPhase } from '../src/calculations';
import { addDays } from '../src/dates';

const day = (i) => addDays('2026-08-24', i); // 2026-08-24 is a Monday

describe('rollingAverage', () => {
  it('averages only the trailing 7 days', () => {
    const logs = [80, 80, 80, 80, 80, 80, 80, 90].map((kg, i) => ({ date: day(i), morningWeightKg: kg }));
    const r = rollingAverage(logs);
    expect(r[6].avg).toBe(80);
    expect(r[7].avg).toBeCloseTo((80 * 6 + 90) / 7);
  });
  it('handles no data', () => expect(rollingAverage([])).toEqual([]));
});

describe('groupByWeek', () => {
  it('splits Sunday and Monday into different weeks, across a month end', () => {
    const w = groupByWeek([
      { date: '2026-08-30', morningWeightKg: 80 },
      { date: '2026-08-31', morningWeightKg: 78 },
    ]);
    expect(w.map((x) => x.weekStart)).toEqual(['2026-08-24', '2026-08-31']);
  });
});

describe('computeAdaptiveTDEE', () => {
  it('finds maintenance when weight is flat', () => {
    const logs = Array.from({ length: 15 }, (_, i) => ({ date: day(i), morningWeightKg: 80, caloriesConsumed: 2500 }));
    expect(computeAdaptiveTDEE(logs).tdee).toBeCloseTo(2500);
  });
  it('adds the deficit back when losing 0.1 kg/day', () => {
    const logs = Array.from({ length: 15 }, (_, i) => ({ date: day(i), morningWeightKg: 80 - i * 0.1, caloriesConsumed: 2000 }));
    expect(computeAdaptiveTDEE(logs).tdee).toBeCloseTo(2000 + 770);
  });
  it('is not ready under 14 days', () => {
    const logs = [0, 5].map((i) => ({ date: day(i), morningWeightKg: 80 }));
    expect(computeAdaptiveTDEE(logs).ready).toBe(false);
  });
});

it('logsInPhase respects both ends', () => {
  const logs = [day(0), day(5), day(10)].map((date) => ({ date }));
  expect(logsInPhase(logs, { startDate: day(1), endDate: day(9) })).toEqual([{ date: day(5) }]);
});
