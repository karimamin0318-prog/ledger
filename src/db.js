import Dexie from 'dexie';
import { toDateStr, addDays } from './dates';
import { isValidWeight, isValidCalories } from './importParser';
import { GOALS } from './calculations';

export const db = new Dexie('ledger');
// Dexie only needs old versions that carry an upgrade function, so just the latest is declared.
db.version(3).stores({
  // date (YYYY-MM-DD) is the key; weight and calories are set independently.
  logs: 'date',
  // A phase is a named date range (endDate null while ongoing). Logs aren't tagged:
  // membership is derived from the date, so editing logs never touches phases.
  phases: '++id, startDate',
  // key/value app settings, see SETTING_DEFAULTS
  settings: 'key',
});

export const THEMES = { dark: 'Dark', light: 'Light', midnight: 'Midnight', sakura: 'Sakura', 'sakura-night': 'Sakura Night' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Every setting the app knows; backups save and restore exactly these keys.
export const SETTING_DEFAULTS = { theme: 'dark', steps: '', sex: 'm', age: '', height: '', lastBackup: '', goal: 'maintain' };
const SETTING_CHOICES = { theme: THEMES, goal: GOALS };

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

/**
 * Merges a backup made by exportData(): never deletes, but its values replace the same days and settings.
 * Returns how many logs and new phases were saved. Saves nothing if the file has logs but none are usable.
 */
export async function importBackup(data) {
  if (data?.app !== 'ledger' || !Array.isArray(data.logs)) throw new Error('Not a Ledger backup file.');
  const phases = Array.isArray(data.phases) ? data.phases : [];
  const saved = { logs: 0, phases: 0 };
  await db.transaction('rw', db.logs, db.phases, db.settings, async () => {
    for (const { date, morningWeightKg, caloriesConsumed } of data.logs) {
      if (!DATE_RE.test(date)) continue;
      const fields = {};
      if (isValidWeight(morningWeightKg)) fields.morningWeightKg = morningWeightKg;
      if (isValidCalories(caloriesConsumed)) fields.caloriesConsumed = caloriesConsumed;
      if (!Object.keys(fields).length) continue;
      await mergeLog(date, fields);
      saved.logs++;
    }
    // Thrown inside the transaction so nothing from this file is kept.
    if (data.logs.length && !saved.logs) throw new Error('No valid entries found in this file.');
    const existing = await db.phases.toArray();
    const have = new Set(existing.map((p) => p.name + p.startDate));
    let active = existing.find((p) => !p.endDate);
    for (const { name, startDate, endDate } of phases) {
      if (typeof name !== 'string' || !DATE_RE.test(startDate) || (endDate && !DATE_RE.test(endDate))) continue;
      if (have.has(name + startDate)) continue;
      let end = endDate || null;
      // Only one phase may stay open: the one that started last. The other ends the day before it.
      if (!end && active) {
        if (startDate > active.startDate) await db.phases.update(active.id, { endDate: addDays(startDate, -1) });
        else end = startDate < active.startDate ? addDays(active.startDate, -1) : startDate;
      }
      const id = await db.phases.add({ name, startDate, endDate: end });
      if (!end) active = { id, startDate };
      saved.phases++;
    }
    for (const key of Object.keys(SETTING_DEFAULTS)) {
      const value = data.settings?.[key];
      const choices = SETTING_CHOICES[key];
      if (['string', 'number'].includes(typeof value) && (!choices || Object.hasOwn(choices, value))) await saveSetting(key, value);
    }
  });
  return saved;
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

/** Moves a phase's start. If the phase before it ended right before (or would now overlap), it is moved to end the day before. */
export function movePhaseStart(id, startDate) {
  return db.transaction('rw', db.phases, async () => {
    const all = await getAllPhases();
    const i = all.findIndex((p) => p.id === id);
    const [prev, phase] = [all[i - 1], all[i]];
    if (phase.endDate && startDate > phase.endDate) throw new Error(`Start must be on or before its end (${phase.endDate}).`);
    if (prev && startDate <= prev.startDate) throw new Error(`Start must be after "${prev.name}" began (${prev.startDate}).`);
    if (prev && (prev.endDate >= startDate || prev.endDate === addDays(phase.startDate, -1))) {
      await db.phases.update(prev.id, { endDate: addDays(startDate, -1) });
    }
    await db.phases.update(id, { startDate });
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
