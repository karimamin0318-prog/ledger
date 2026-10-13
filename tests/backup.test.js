import 'fake-indexeddb/auto';
import { it, expect } from 'vitest';
import { db, exportData, importBackup } from '../src/db';

it('restores logs, phases and settings from a backup, and survives a round trip', async () => {
  const backup = {
    app: 'ledger',
    logs: [
      { date: '2026-08-24', morningWeightKg: 80, caloriesConsumed: null },
      { date: '2026-09-09', morningWeightKg: 81, caloriesConsumed: 1750 },
      { date: 'garbage', morningWeightKg: 80, caloriesConsumed: null },
    ],
    phases: [{ name: 'Cut', startDate: '2026-08-24', endDate: null }],
    settings: { theme: 'light', lastBackup: '2026-10-01', evil: 'x' },
  };
  expect(await importBackup(backup)).toEqual({ logs: 2, phases: 1 });
  const out = await exportData();
  expect(out.logs.map((l) => l.date)).toEqual(['2026-08-24', '2026-09-09']);
  expect(out.logs[1].caloriesConsumed).toBe(1750);
  expect(out.phases).toMatchObject([{ name: 'Cut', startDate: '2026-08-24', endDate: null }]);
  expect(out.settings).toEqual({ theme: 'light', lastBackup: '2026-10-01' });

  expect(await importBackup(out)).toEqual({ logs: 2, phases: 0 }); // no duplicates
  expect(await db.logs.count()).toBe(2);
  expect(await db.phases.count()).toBe(1);
});

it('refuses a file where nothing is usable instead of claiming success', async () => {
  await expect(importBackup({ app: 'ledger', logs: [{ date: 'x' }] })).rejects.toThrow('No valid entries');
  await expect(importBackup({ foo: 1 })).rejects.toThrow('Not a Ledger backup');
});
