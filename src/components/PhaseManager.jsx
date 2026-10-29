import { useState } from 'react';
import { Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { startPhase, endPhase, movePhaseStart, todayStr } from '../db';
import { card, input, btnPrimary, btnSecondary, label } from '../ui';
import { fmtShort } from '../dates';

/**
 * Phase card on the Log tab. Arrows browse phases (`phase` null = the "no active phase" slot);
 * the buttons start a new phase, end the active one, or move a phase's start.
 */
export default function PhaseManager({ phase, active, hasPrev, hasNext, onMove, onStarted }) {
  const [mode, setMode] = useState(null); // null | 'start' | 'end' | 'move'
  const [name, setName] = useState('');
  const [dateVal, setDateVal] = useState('');
  const [error, setError] = useState('');
  const today = todayStr();

  function open(next, date) {
    setName('');
    setDateVal(date);
    setError('');
    setMode(next);
  }
  function go(delta) {
    setMode(null);
    onMove(delta);
  }
  async function confirm() {
    if (!dateVal || (mode === 'start' && !name.trim())) return;
    try {
      if (mode === 'start') await startPhase(name.trim(), dateVal);
      if (mode === 'end') await endPhase(phase.id, dateVal);
      if (mode === 'move') await movePhaseStart(phase.id, dateVal);
      if (mode === 'start') onStarted();
      setMode(null);
    } catch (e) {
      setError(e.message);
    }
  }

  // The phase can change under an open form (it was just ended, or the arrows moved), so every form checks it is still valid.
  const form =
    mode === 'start' ? { title: 'Starts on', action: 'Start', max: today, hint: active && `This will end "${active.name}" the day before.` }
    : mode === 'end' && phase && !phase.endDate ? { title: `End "${phase.name}" on`, action: 'End', min: phase.startDate, max: today }
    : mode === 'move' && phase ? { title: `New start for "${phase.name}"`, action: 'Move', max: phase.endDate || today, hint: 'The phase before it moves along, so no days fall between them.' }
    : null;

  return (
    <div className={card + ' flex flex-col gap-3'}>
      <div className="flex items-center gap-2">
        <Layers size={15} className="text-emerald-400" />
        <span className={label}>Phase</span>
      </div>

      <div className="flex items-center gap-2">
        <Arrow disabled={!hasPrev} onClick={() => go(-1)} label="Previous phase" Icon={ChevronLeft} />
        <div className="flex-1 min-w-0 flex flex-col items-center text-center">
          {phase ? (
            <>
              <span className="text-white font-semibold truncate max-w-full">{phase.name}</span>
              <span className="text-zinc-500 text-xs">
                {phase.endDate ? `${fmtShort(phase.startDate)} – ${fmtShort(phase.endDate)}` : `since ${fmtShort(phase.startDate)}`}
              </span>
            </>
          ) : (
            <span className="text-zinc-600 text-sm py-2">No active phase</span>
          )}
        </div>
        <Arrow disabled={!hasNext} onClick={() => go(1)} label="Next phase" Icon={ChevronRight} />
      </div>

      {form ? (
        <div className="flex flex-col gap-2 pt-3 border-t border-zinc-800/80">
          {form.hint && <span className="text-[11px] text-amber-400/80">{form.hint}</span>}
          {error && <span className="text-[11px] text-red-400">{error}</span>}
          {mode === 'start' && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Phase name, e.g. Cut Sep 2026"
              className={input + ' w-full min-w-0 text-sm py-2.5'}
            />
          )}
          <span className="text-xs text-zinc-500">{form.title}</span>
          <input
            type="date"
            value={dateVal}
            min={form.min}
            max={form.max}
            onChange={(e) => setDateVal(e.target.value)}
            className={input + ' w-full min-w-0 !px-2.5 text-[14px] py-2 [color-scheme:dark]'}
          />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode(null)} className={btnSecondary + ' py-2.5 text-sm'}>
              Cancel
            </button>
            <button onClick={confirm} className={btnPrimary + ' py-2.5 text-sm'}>
              {form.action}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {phase && (
            <button onClick={() => open('move', phase.startDate)} className={btnSecondary + ' flex-1 text-xs py-2.5'}>
              Move start
            </button>
          )}
          {phase && !phase.endDate && (
            <button onClick={() => open('end', today)} className={btnSecondary + ' flex-1 text-xs py-2.5'}>
              End phase
            </button>
          )}
          {!hasNext && (
            <button onClick={() => open('start', today)} className={btnSecondary + ' flex-1 text-xs py-2.5'}>
              + New phase
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Arrow({ disabled, onClick, label: text, Icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={text}
      className="w-9 h-9 shrink-0 flex items-center justify-center rounded-(--field-radius) text-zinc-400 active:bg-zinc-800 disabled:opacity-25"
    >
      <Icon size={18} />
    </button>
  );
}
