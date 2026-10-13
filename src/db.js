import Dexie from 'dexie';
import { toDateStr, addDays } from './dates';
import { isValidWeight, isValidCalories } from './importParser';

export const db = new Dexie('ledger');
db.version(1).stores({
  // date (YYYY-MM-DD) is the primary key. morningWeightKg / caloriesConsumed
  // are set independently — a row can have either, both, or be created with
  // just one and filled in later by a different day's submission.
  logs: 'date',
});
db.version(2).stores({
  logs: 'date',
  // A phase is just a named date range (endDate: null while ongoing). Logs
  // aren't tagged with a phase id — membership is derived purely from
  // whether a log's date falls inside the phase's range, so importing or
  // editing logs never needs to know about phases at all.
  phases: '++id, startDate',
});

db.version(3).stores({
  logs: 'date',
  phases: '++id, startDate',
  // key/value app settings: theme, steps, sex, age, height
  settings: 'key',
});

export const THEMES = { dark: 'Dark', light: 'Light', midnight: 'Midnight' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SETTING_KEYS = ['theme', 'steps', 'sex', 'age', 'height'];

export function saveSetting(key, value) {
  return db.settings.put({ key, value });
}

export function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toDateStr(d);
}

export async function getAllLogs() {
  const rows = await db.logs.toArray();
  return rows.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function upsertWeight(date, kg) {
  return mergeLog(date, { morningWeightKg: kg });
}

export function upsertCalories(date, kcal) {
  return mergeLog(date, { caloriesConsumed: kcal });
}

function mergeLog(date, fields) {
  return db.transaction('rw', db.logs, async () => {
    const existing = await db.logs.get(date);
    await db.logs.put({ date, morningWeightKg: null, caloriesConsumed: null, ...existing, ...fields });
  });
}

/**
 * Merges a batch of {date, kg} entries into existing data — never wipes
 * unrelated dates, and preserves any calories already stored for a date
 * that's being given a (new or updated) weight value.
 */
export async function bulkImportWeights(entries) {
  await db.transaction('rw', db.logs, async () => {
    for (const { date, kg } of entries) await mergeLog(date, { morningWeightKg: kg });
  });
}

/** Everything the user ever entered (logs, phases, settings), for a downloadable backup. */
export async function exportData() {
  const settings = Object.fromEntries((await db.settings.toArray()).map((r) => [r.key, r.value]));
  return { app: 'ledger', version: 2, exportedAt: new Date().toISOString(), logs: await getAllLogs(), phases: await getAllPhases(), settings };
}

/** Merges a backup made by exportData(): fills values in, never deletes logs or phases. Returns the log count. */
export async function importBackup(data) {
  if (data?.app !== 'ledger' || !Array.isArray(data.logs)) throw new Error('Not a Ledger backup file.');
  const phases = Array.isArray(data.phases) ? data.phases : [];
  await db.transaction('rw', db.logs, db.phases, db.settings, async () => {
    for (const { date, morningWeightKg, caloriesConsumed } of data.logs) {
      if (!DATE_RE.test(date)) continue;
      const fields = {};
      if (isValidWeight(morningWeightKg)) fields.morningWeightKg = morningWeightKg;
      if (isValidCalories(caloriesConsumed)) fields.caloriesConsumed = caloriesConsumed;
      await mergeLog(date, fields);
    }
    const have = new Set((await db.phases.toArray()).map((p) => p.name + p.startDate));
    for (const { name, startDate, endDate } of phases) {
      if (typeof name !== 'string' || !DATE_RE.test(startDate) || (endDate && !DATE_RE.test(endDate))) continue;
      if (!have.has(name + startDate)) await db.phases.add({ name, startDate, endDate: endDate ?? null });
    }
    for (const key of SETTING_KEYS) {
      const value = data.settings?.[key];
      if (['string', 'number'].includes(typeof value) && (key !== 'theme' || value in THEMES)) await saveSetting(key, value);
    }
  });
  return data.logs.length;
}

export async function getAllPhases() {
  const rows = await db.phases.toArray();
  return rows.sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
}

export async function getActivePhase() {
  const all = await getAllPhases();
  return all.find((p) => !p.endDate) || null;
}

/** Starts a new open-ended phase, auto-closing whatever phase was active the day before it begins. */
export function startPhase(name, startDate) {
  return db.transaction('rw', db.phases, async () => {
    const active = await getActivePhase();
    if (active && startDate <= active.startDate) {
      throw new Error(`Start date must be after "${active.name}" began (${active.startDate}).`);
    }
    if (active) await db.phases.update(active.id, { endDate: addDays(startDate, -1) });
    await db.phases.add({ name, startDate, endDate: null });
  });
}

export async function endPhase(id, endDate) {
  await db.phases.update(id, { endDate });
}

export async function deletePhase(id) {
  await db.phases.delete(id);
}

export async function deleteField(date, field) {
  const existing = await db.logs.get(date);
  if (!existing) return;
  const other = field === 'morningWeightKg' ? 'caloriesConsumed' : 'morningWeightKg';
  if (existing[other] === null || existing[other] === undefined) {
    await db.logs.delete(date);
  } else {
    await db.logs.put({ ...existing, [field]: null });
  }
}
