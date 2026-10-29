import 'fake-indexeddb/auto';
import { it, expect, beforeEach } from 'vitest';
import { db, startPhase, endPhase, movePhaseStart, getAllPhases, upsertWeight, upsertCalories, deleteField, importBackup, exportData } from '../src/db';
import { isValidCalories } from '../src/importParser';

beforeEach(() => Promise.all(db.tables.map((t) => t.clear())));

it('starting a phase ends the active one the day before, and refuses a start before it', async () => {
  await startPhase('Bulk', '2026-06-01');
  await startPhase('Cut', '2026-09-01');
  expect(await getAllPhases()).toMatchObject([
    { name: 'Bulk', endDate: '2026-08-31' },
    { name: 'Cut', endDate: null },
  ]);
  await expect(startPhase('Old', '2026-08-01')).rejects.toThrow('must be after');
});

it('a new phase after an ended one never overlaps or lands before it', async () => {
  await startPhase('Cut', '2026-09-01');
  await endPhase((await getAllPhases())[0].id, '2026-10-20');
  await startPhase('Bulk', '2026-10-01');
  expect(await getAllPhases()).toMatchObject([
    { name: 'Cut', endDate: '2026-09-30' },
    { name: 'Bulk', endDate: null },
  ]);
  await expect(startPhase('Old', '2026-08-01')).rejects.toThrow('must be after');
});

it('restoring after a moved start adds no second copy of the phase', async () => {
  await startPhase('Bulk', '2026-06-01');
  await startPhase('Cut', '2026-09-01');
  const backup = await exportData();
  await movePhaseStart((await getAllPhases())[1].id, '2026-09-05');
  expect(await importBackup(backup)).toMatchObject({ phases: 0 });
  await movePhaseStart((await getAllPhases())[1].id, '2026-08-25');
  expect(await importBackup(backup)).toMatchObject({ phases: 0 });
  expect(await db.phases.count()).toBe(2);
});

it('deleting one field keeps the other, deleting the last one removes the day', async () => {
  await upsertWeight('2026-09-01', 80);
  await upsertCalories('2026-09-01', 0); // a fasting day is a real value
  await deleteField('2026-09-01', 'morningWeightKg');
  expect(await db.logs.get('2026-09-01')).toMatchObject({ morningWeightKg: null, caloriesConsumed: 0 });
  await deleteField('2026-09-01', 'caloriesConsumed');
  expect(await db.logs.get('2026-09-01')).toBeUndefined();
});

it('allows 0 kcal but not negative calories', () => {
  expect(isValidCalories(0)).toBe(true);
  expect(isValidCalories(-1)).toBe(false);
});

it('restoring an open phase leaves only the latest one open', async () => {
  await startPhase('Cut', '2026-09-01');
  await importBackup({ app: 'ledger', logs: [], phases: [{ name: 'Bulk', startDate: '2026-06-01', endDate: null }] });
  expect(await getAllPhases()).toMatchObject([
    { name: 'Bulk', endDate: '2026-08-31' },
    { name: 'Cut', endDate: null },
  ]);
  await importBackup({ app: 'ledger', logs: [], phases: [{ name: 'Maint', startDate: '2026-10-01', endDate: null }] });
  expect((await getAllPhases()).map((p) => p.endDate)).toEqual(['2026-08-31', '2026-09-30', null]);
});

it('a backup with no usable logs saves nothing at all', async () => {
  const bad = { app: 'ledger', logs: [{ date: 'x' }], phases: [{ name: 'Cut', startDate: '2026-09-01' }], settings: { theme: 'light' } };
  await expect(importBackup(bad)).rejects.toThrow('No valid entries');
  expect(await db.phases.count()).toBe(0);
  expect(await db.settings.count()).toBe(0);
});

it('moving a start drags the touching phase before it along, and refuses impossible dates', async () => {
  await startPhase('Bulk', '2026-06-01');
  await startPhase('Cut', '2026-09-01');
  const cut = (await getAllPhases())[1];
  await movePhaseStart(cut.id, '2026-09-05');
  expect(await getAllPhases()).toMatchObject([
    { name: 'Bulk', endDate: '2026-09-04' },
    { name: 'Cut', startDate: '2026-09-05' },
  ]);
  await expect(movePhaseStart(cut.id, '2026-05-01')).rejects.toThrow('must be after');
});
