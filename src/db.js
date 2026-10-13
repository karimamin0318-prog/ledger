import Dexie from 'dexie';

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

export function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getAllLogs() {
  const rows = await db.logs.toArray();
  return rows.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function upsertWeight(date, kg) {
  const existing = await db.logs.get(date);
  await db.logs.put({ date, caloriesConsumed: null, ...existing, morningWeightKg: kg });
}

export async function upsertCalories(date, kcal) {
  const existing = await db.logs.get(date);
  await db.logs.put({ date, morningWeightKg: null, ...existing, caloriesConsumed: kcal });
}

/**
 * Merges a batch of {date, kg} entries into existing data — never wipes
 * unrelated dates, and preserves any calories already stored for a date
 * that's being given a (new or updated) weight value.
 */
export async function bulkImportWeights(entries) {
  await db.transaction('rw', db.logs, async () => {
    for (const { date, kg } of entries) {
      const existing = await db.logs.get(date);
      await db.logs.put({ date, caloriesConsumed: null, ...existing, morningWeightKg: kg });
    }
  });
}

function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
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
export async function startPhase(name, startDate) {
  const active = await getActivePhase();
  if (active) {
    await db.phases.update(active.id, { endDate: addDays(startDate, -1) });
  }
  await db.phases.add({ name, startDate, endDate: null });
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
