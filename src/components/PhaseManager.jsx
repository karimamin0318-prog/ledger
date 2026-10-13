import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layers } from 'lucide-react';
import { getActivePhase, startPhase, endPhase, todayStr } from '../db';
import { card, input, btnPrimary, btnSecondary, label } from '../ui';
import { fmtShort } from '../dates';

export default function PhaseManager() {
  const [mode, setMode] = useState(null); // null | 'start' | 'end'
  const [name, setName] = useState('');
  const [dateVal, setDateVal] = useState(todayStr());
  const [error, setError] = useState('');

  const active = useLiveQuery(() => getActivePhase(), [], null);

  function openStart() {
    setName('');
    setDateVal(todayStr());
    setError('');
    setMode('start');
  }
  function openEnd() {
    setDateVal(todayStr());
    setMode('end');
  }

  async function confirmStart() {
    if (!name.trim()) return;
    try {
      await startPhase(name.trim(), dateVal);
      setMode(null);
    } catch (e) {
      setError(e.message);
    }
  }
  async function confirmEnd() {
    if (!active) return;
    await endPhase(active.id, dateVal);
    setMode(null);
  }

  return (
    <div className={card + ' flex flex-col gap-3'}>
      <div className="flex items-center gap-2">
        <Layers size={15} className="text-emerald-400" />
        <span className={label}>Phase</span>
      </div>

      {active ? (
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-white font-semibold">{active.name}</span>
            <span className="text-zinc-500 text-xs">since {fmtShort(active.startDate)}</span>
          </div>
          {mode !== 'end' && (
            <button onClick={openEnd} className={btnSecondary + ' text-xs px-3 py-2'}>
              End Phase
            </button>
          )}
        </div>
      ) : (
        <p className="text-zinc-600 text-sm">No active phase.</p>
      )}

      {mode === 'end' && (
        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/80">
          <span className="text-xs text-zinc-500">End "{active.name}" on</span>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateVal}
              min={active.startDate}
              max={todayStr()}
              onChange={(e) => setDateVal(e.target.value)}
              className={input + ' flex-1 !px-2.5 text-[14px] py-2 [color-scheme:dark]'}
            />
            <button onClick={confirmEnd} className={btnPrimary + ' px-4 text-sm'}>
              Confirm
            </button>
            <button onClick={() => setMode(null)} className={btnSecondary + ' px-3 text-sm'}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode !== 'end' && (
        <>
          {mode === 'start' ? (
            <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/80">
              {active && (
                <span className="text-[11px] text-amber-400/80">
                  This will end "{active.name}" the day before this phase starts.
                </span>
              )}
              {error && <span className="text-[11px] text-red-400">{error}</span>}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Phase name, e.g. Cut Sep 2026"
                className={input + ' text-sm py-2.5'}
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateVal}
                  onChange={(e) => setDateVal(e.target.value)}
                  className={input + ' flex-1 !px-2.5 text-[14px] py-2 [color-scheme:dark]'}
                />
                <button onClick={confirmStart} className={btnPrimary + ' px-4 text-sm'}>
                  Start
                </button>
                <button onClick={() => setMode(null)} className={btnSecondary + ' px-3 text-sm'}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={openStart} className={btnSecondary + ' text-sm py-2.5'}>
              + New Phase
            </button>
          )}
        </>
      )}

    </div>
  );
}
