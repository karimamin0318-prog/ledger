const DAY_MS = 86400000;
const KCAL_PER_KG = 7700;
export const MIN_DAYS_FOR_TDEE = 14; // 2 weeks minimum

function toDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function daysBetween(a, b) {
  return Math.round((toDate(b) - toDate(a)) / DAY_MS);
}

/** Filters logs down to those falling within a phase's date range. `null` phase means "all time". */
export function logsInPhase(logs, phase) {
  if (!phase) return logs;
  return logs.filter((l) => l.date >= phase.startDate && (!phase.endDate || l.date <= phase.endDate));
}

/** Rolling trailing-window average (up to 7 days) for every day that has a weight entry. */
export function rollingAverage(logs, windowDays = 7) {
  const weightDays = logs.filter((l) => l.morningWeightKg != null);
  return weightDays.map((entry) => {
    const windowStart = new Date(toDate(entry.date));
    windowStart.setDate(windowStart.getDate() - (windowDays - 1));
    const inWindow = weightDays.filter((w) => {
      const t = toDate(w.date);
      return t >= windowStart && t <= toDate(entry.date);
    });
    const avg = inWindow.reduce((s, w) => s + w.morningWeightKg, 0) / inWindow.length;
    return { date: entry.date, raw: entry.morningWeightKg, avg };
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
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
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

/**
 * Adaptive TDEE: compares the change in rolling-average bodyweight against
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
  const deltaWeight = last.avg - first.avg;

  const calorieEntries = logs.filter(
    (l) => l.caloriesConsumed != null && l.date >= first.date && l.date <= last.date
  );
  const avgCalories = calorieEntries.length
    ? calorieEntries.reduce((s, l) => s + l.caloriesConsumed, 0) / calorieEntries.length
    : null;

  if (daysElapsed < MIN_DAYS_FOR_TDEE) {
    return { ...base, ready: false, daysElapsed, avgCalories, deltaWeight, reason: 'days' };
  }
  if (calorieEntries.length < 7) {
    return { ...base, ready: false, daysElapsed, avgCalories, deltaWeight, reason: 'calories' };
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

export const GOALS = {
  lose_fast: { label: 'Lose Fast', rateOfWeightPerWeek: -0.01 },
  lose_slow: { label: 'Lose Slow', rateOfWeightPerWeek: -0.007 },
  maintain: { label: 'Maintain', rateOfWeightPerWeek: 0 },
  gain: { label: 'Gain', rateOfWeightPerWeek: 0.0025 },
};

export function goalTargetCalories(tdee, currentWeightKg, goalKey) {
  const goal = GOALS[goalKey];
  if (!goal) return tdee;
  const dailyAdjustment = (currentWeightKg * goal.rateOfWeightPerWeek * KCAL_PER_KG) / 7;
  return tdee + dailyAdjustment;
}
