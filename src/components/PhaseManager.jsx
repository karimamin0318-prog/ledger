import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layers, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllPhases, getActivePhase, startPhase, endPhase, deletePhase, todayStr } from '../db';
import { card, input, btnPrimary, btnSecondary, label } from '../ui';

function fmtShort(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${d}.${m}`;
}

export default function PhaseManager() {
  const [mode, setMode] = useState(null); // null | 'start' | 'end'
  const [name, setName] = useState('');
  const [dateVal, setDateVal] = useState(todayStr());
  const [showHistory, setShowHistory] = useState(false);

  const phases = useLiveQuery(() => getAllPhases(), [], []);
  const active = useLiveQuery(() => getActivePhase(), [], null);

  const past = (phases || []).filter((p) => p.id !== active?.id).reverse();

  function openStart() {
    setName('');
    setDateVal(todayStr());
    setMode('start');
  }
  function openEnd() {
    setDateVal(todayStr());
    setMode('end');
  }

  async function confirmStart() {
    if (!name.trim()) return;
    await startPhase(name.trim(), dateVal);
    setMode(null);
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

      {past.length > 0 && (
        <div className="pt-1 border-t border-zinc-800/80">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1 text-xs text-zinc-500"
          >
            {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {past.length} past {past.length === 1 ? 'phase' : 'phases'}
          </button>
          {showHistory && (
            <div className="flex flex-col gap-1.5 mt-2">
              {past.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs text-zinc-400">
                  <span>
                    {p.name} <span className="text-zinc-600">· {fmtShort(p.startDate)}–{fmtShort(p.endDate)}</span>
                  </span>
                  <button onClick={() => deletePhase(p.id)} className="text-zinc-700 active:text-red-400">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
