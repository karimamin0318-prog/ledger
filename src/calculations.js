import { toDate, toDateStr, daysBetween, addDays } from './dates';

const KCAL_PER_KG = 7700;
export const MIN_DAYS_FOR_TDEE = 14; // 2 weeks minimum
export const MIN_CALORIE_DAYS = 7;

/** Filters logs down to those falling within a phase's date range. `null` phase means "all time". */
export function logsInPhase(logs, phase) {
  if (!phase) return logs;
  return logs.filter((l) => l.date >= phase.startDate && (!phase.endDate || l.date <= phase.endDate));
}

/** Rolling trailing-window average (up to 7 days) for every day that has a weight entry. */
export function rollingAverage(logs, windowDays = 7) {
  const weightDays = logs.filter((l) => l.morningWeightKg != null); // sorted by date
  const day = weightDays.map((w) => daysBetween(weightDays[0].date, w.date));
  let lo = 0;
  let sum = 0;
  return weightDays.map((entry, i) => {
    sum += entry.morningWeightKg;
    while (day[i] - day[lo] >= windowDays) sum -= weightDays[lo++].morningWeightKg;
    return { date: entry.date, raw: entry.morningWeightKg, avg: sum / (i - lo + 1) };
  });
}

/** Groups weight + calorie entries by ISO calendar week (Mon-Sun). */
export function groupByWeek(logs) {
  const weeks = new Map();
  for (const log of logs) {
    const d = toDate(log.date);
    const day = (d.getDay() + 6) % 7; // 0 = Monday
    const monday = new Date(d);
    monday.setDate(d.getDate() - day);
    const key = toDateStr(monday);
    if (!weeks.has(key)) weeks.set(key, { weekStart: key, weights: [], calories: [] });
    const bucket = weeks.get(key);
    if (log.morningWeightKg != null) bucket.weights.push(log.morningWeightKg);
    if (log.caloriesConsumed != null) bucket.calories.push(log.caloriesConsumed);
  }
  return Array.from(weeks.values())
    .map((w) => ({
      weekStart: w.weekStart,
      avgWeight: w.weights.length ? w.weights.reduce((s, x) => s + x, 0) / w.weights.length : null,
      avgCalories: w.calories.length ? w.calories.reduce((s, x) => s + x, 0) / w.calories.length : null,
    }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
}

/** Least-squares slope (kg/day) through the raw weights, so one noisy day can't swing the result. */
export function trendSlope(points) {
  const x = points.map((p) => daysBetween(points[0].date, p.date));
  const n = x.length;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = points.reduce((s, p) => s + p.raw, 0) / n;
  let num = 0;
  let den = 0;
  points.forEach((p, i) => {
    num += (x[i] - mx) * (p.raw - my);
    den += (x[i] - mx) ** 2;
  });
  return num / den;
}

/**
 * Adaptive TDEE: compares the weight trend (regression slope) against
 * average intake over the same span to back-calculate true maintenance.
 *   dailyCaloricDelta = deltaWeightKg * 7700 / daysElapsed
 *   trueTDEE = avgCalories - dailyCaloricDelta
 */
export function computeAdaptiveTDEE(logs) {
  const rolling = rollingAverage(logs);
  const currentWeight = rolling.length ? rolling[rolling.length - 1].avg : null;
  const calorieCount = logs.filter((l) => l.caloriesConsumed != null).length;

  const base = { needed: MIN_DAYS_FOR_TDEE, currentWeight, calorieCount };

  if (rolling.length < 2) {
    return { ...base, ready: false, daysElapsed: 0, avgCalories: null, deltaWeight: null };
  }

  const first = rolling[0];
  const last = rolling[rolling.length - 1];
  const daysElapsed = daysBetween(first.date, last.date);
  const deltaWeight = trendSlope(rolling) * daysElapsed;

  const calorieEntries = logs.filter(
    (l) => l.caloriesConsumed != null && l.date >= first.date && l.date <= last.date
  );
  const avgCalories = calorieEntries.length
    ? calorieEntries.reduce((s, l) => s + l.caloriesConsumed, 0) / calorieEntries.length
    : null;

  if (daysElapsed < MIN_DAYS_FOR_TDEE) {
    return { ...base, ready: false, daysElapsed, avgCalories, deltaWeight, reason: 'days' };
  }
  if (calorieEntries.length < MIN_CALORIE_DAYS) {
    // Only days between the first and last weigh-in count, so the "more needed" hint uses the same count.
    return { ...base, calorieCount: calorieEntries.length, ready: false, daysElapsed, avgCalories, deltaWeight, reason: 'calories' };
  }

  const dailyCaloricDelta = (deltaWeight * KCAL_PER_KG) / daysElapsed;
  const trueTDEE = avgCalories - dailyCaloricDelta;

  return {
    ...base,
    ready: true,
    tdee: trueTDEE,
    daysElapsed,
    avgCalories,
    deltaWeight,
    currentWeight,
  };
}

export const BRIDGE_DAYS = 28;

/**
 * TDEE for one phase (null = all time). Until the phase has enough data of its own, the last
 * BRIDGE_DAYS before it count too, if the phase before reaches into them; that earlier phase's own number never changes.
 * When it bridges, the result also carries `own` (this phase alone) and `bridge` (the earlier phase).
 */
export function phaseTDEE(logs, phase, phases) {
  const own = computeAdaptiveTDEE(logsInPhase(logs, phase));
  const prev = phase && phases.filter((p) => p.startDate < phase.startDate).at(-1);
  if (own.ready || !prev) return own;
  const from = addDays(phase.startDate, -BRIDGE_DAYS);
  if (prev.endDate && prev.endDate < from) return own; // the phase before ended too long ago to stand in
  const bridged = computeAdaptiveTDEE(
    logsInPhase(logs, { startDate: from > prev.startDate ? from : prev.startDate, endDate: phase.endDate })
  );
  return bridged.ready ? { ...bridged, own, bridge: prev } : own;
}

export const GOALS = {
  lose_fast: { label: 'Lose Fast', rateOfWeightPerWeek: -0.01 },
  lose_slow: { label: 'Lose Slow', rateOfWeightPerWeek: -0.007 },
  maintain: { label: 'Maintain', rateOfWeightPerWeek: 0 },
  gain: { label: 'Gain', rateOfWeightPerWeek: 0.0025 },
  gain_fast: { label: 'Gain Fast' }, // joke option: the UI refuses it, so it has no rate
};

export function goalTargetCalories(tdee, currentWeightKg, goalKey) {
  const goal = GOALS[goalKey];
  if (goal?.rateOfWeightPerWeek == null) return tdee;
  const dailyAdjustment = (currentWeightKg * goal.rateOfWeightPerWeek * KCAL_PER_KG) / 7;
  return tdee + dailyAdjustment;
}

/**
 * Formula estimate of maintenance for when there is not enough data for a measured TDEE.
 * BMR: Mifflin-St Jeor (1990), the most accurate common equation. Baseline x1.2 (sedentary)
 * covers daily living; walking above ~3000 steps adds about 0.5 kcal per kg per 1000 steps.
 * shortcut: steps are a rough yearly average and add no exercise on top, upgrade if workouts need logging.
 */
export function estimateTDEE({ sex, age, heightCm, weightKg, steps }) {
  const [a, h, w, st] = [age, heightCm, weightKg, steps].map(Number);
  if (!(a >= 10 && a <= 100 && h >= 100 && h <= 230 && w >= 20 && w <= 400 && st >= 0 && st <= 50000)) return null;
  if (steps === '' || steps == null) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a + (sex === 'f' ? -161 : 5);
  return bmr * 1.2 + Math.max(0, st - 3000) * w * 0.0005;
}

/** Numbers for one phase. `today` closes an open phase. */
export function phaseSummary(logs, phase, today) {
  const scoped = logsInPhase(logs, phase);
  const end = phase.endDate || today;
  const days = Math.max(1, daysBetween(phase.startDate, end) + 1);
  const rolling = rollingAverage(scoped);
  const cals = scoped.filter((l) => l.caloriesConsumed != null).map((l) => l.caloriesConsumed);
  return {
    end,
    days,
    weeks: days / 7,
    weighIns: rolling.length,
    startWeight: rolling[0]?.raw ?? null,
    endWeight: rolling.at(-1)?.raw ?? null,
    change: rolling.length > 1 ? rolling.at(-1).raw - rolling[0].raw : null,
    perWeek: rolling.length > 1 ? trendSlope(rolling) * 7 : null,
    avgWeight: rolling.length ? rolling.reduce((s, r) => s + r.raw, 0) / rolling.length : null,
    avgCalories: cals.length ? cals.reduce((s, v) => s + v, 0) / cals.length : null,
    calorieDays: cals.length,
  };
}
