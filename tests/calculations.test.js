import { describe, it, expect } from 'vitest';
import { rollingAverage, groupByWeek, computeAdaptiveTDEE, logsInPhase, estimateTDEE, phaseSummary } from '../src/calculations';
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

describe('estimateTDEE', () => {
  const base = { sex: 'm', age: 30, heightCm: 180, weightKg: 80, steps: 3000 };
  it('matches Mifflin-St Jeor x1.2 at 3000 steps', () => {
    expect(estimateTDEE(base)).toBeCloseTo((10 * 80 + 6.25 * 180 - 5 * 30 + 5) * 1.2);
  });
  it('more steps raise it, women get -166 BMR', () => {
    expect(estimateTDEE({ ...base, steps: 10000 })).toBeCloseTo(estimateTDEE(base) + 7000 * 80 * 0.0005);
    expect(estimateTDEE({ ...base, sex: 'f' })).toBeCloseTo(estimateTDEE(base) - 166 * 1.2);
  });
  it('returns null for missing or absurd input', () => {
    expect(estimateTDEE({ ...base, steps: '' })).toBeNull();
    expect(estimateTDEE({ ...base, age: '' })).toBeNull();
    expect(estimateTDEE({ ...base, heightCm: 20 })).toBeNull();
  });
});

describe('phaseSummary', () => {
  it('counts weeks and weight change, closing an open phase at today', () => {
    const logs = Array.from({ length: 14 }, (_, i) => ({ date: day(i), morningWeightKg: 80 - i * 0.1, caloriesConsumed: 2000 }));
    const s = phaseSummary(logs, { startDate: day(0), endDate: null }, day(13));
    expect(s.days).toBe(14);
    expect(s.weeks).toBe(2);
    expect(s.change).toBeCloseTo(-1.3);
    expect(s.perWeek).toBeCloseTo(-0.7);
    expect(s.avgCalories).toBe(2000);
  });
});
