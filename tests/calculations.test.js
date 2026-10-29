import { describe, it, expect } from 'vitest';
import { rollingAverage, groupByWeek, computeAdaptiveTDEE, logsInPhase, estimateTDEE, phaseSummary, phaseTDEE } from '../src/calculations';
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
  it('counts only calorie days between the first and last weigh-in', () => {
    // Day 0 has calories but no weight, so 6 of the 7 calorie days count.
    const logs = Array.from({ length: 16 }, (_, i) => ({ date: day(i), morningWeightKg: i ? 80 : null, caloriesConsumed: i < 7 ? 2500 : null }));
    expect(computeAdaptiveTDEE(logs)).toMatchObject({ ready: false, reason: 'calories', calorieCount: 6 });
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

describe('phaseTDEE', () => {
  // Old phase: 30 days flat at 80 kg on 2500 kcal. New phase starts on day 30 with 5 days on 2000 kcal.
  const logs = Array.from({ length: 35 }, (_, i) => ({ date: day(i), morningWeightKg: 80, caloriesConsumed: i < 30 ? 2500 : 2000 }));
  const old = { id: 1, startDate: day(0), endDate: day(29) };
  const next = { id: 2, startDate: day(30), endDate: null };

  it('a new phase borrows the last 4 weeks of the one before until it has enough of its own', () => {
    const r = phaseTDEE(logs, next, [old, next]);
    expect(r.ready).toBe(true);
    expect(r.bridge).toBe(old);
    expect(r.own.ready).toBe(false);
    expect(r.tdee).toBeCloseTo((2500 * 28 + 2000 * 5) / 33); // days 2-29 of the old phase + days 30-34
  });
  it('does not borrow from a phase that ended more than 4 weeks before', () => {
    const early = { id: 1, startDate: day(0), endDate: day(1) };
    expect(phaseTDEE(logs, next, [early, next]).bridge).toBeUndefined();
  });
  it('the old phase keeps its own number', () => {
    expect(phaseTDEE(logs, old, [old, next]).tdee).toBeCloseTo(2500);
  });
  it('once the new phase is ready on its own, only its days count', () => {
    const longer = [...logs, ...Array.from({ length: 15 }, (_, i) => ({ date: day(35 + i), morningWeightKg: 80, caloriesConsumed: 2000 }))];
    const r = phaseTDEE(longer, next, [old, next]);
    expect(r.bridge).toBeUndefined();
    expect(r.tdee).toBeCloseTo(2000);
  });
});
