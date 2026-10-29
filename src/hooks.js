import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getAllLogs, getAllPhases, SETTING_DEFAULTS } from './db';
import { logsInPhase } from './calculations';

export function useSettings() {
  const stored = useLiveQuery(async () => Object.fromEntries((await db.settings.toArray()).map((r) => [r.key, r.value])));
  return { ...SETTING_DEFAULTS, ...stored, loaded: stored !== undefined };
}

/** Logs and phases, plus a phase picker that defaults to the active phase ('all' = all time). */
export function usePhaseScope() {
  const logs = useLiveQuery(() => getAllLogs(), [], []);
  const phases = useLiveQuery(() => getAllPhases(), [], []);
  const [selected, setSelected] = useState(null);
  const activePhase = phases.find((p) => !p.endDate) || null;
  const phaseId = selected ?? (activePhase ? String(activePhase.id) : 'all');
  const phase = phases.find((p) => String(p.id) === phaseId) || null;
  return { logs, phases, activePhase, phase, phaseId, setPhaseId: setSelected, scopedLogs: logsInPhase(logs, phase) };
}
