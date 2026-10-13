import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, ArrowLeft, Trash2 } from 'lucide-react';
import { getAllLogs, getAllPhases, deletePhase, todayStr } from '../db';
import { phaseSummary } from '../calculations';
import { daysBetween } from '../dates';
import { card, label } from '../ui';

const fmtDate = (s) => s.split('-').reverse().join('.');
const kg = (v) => (v == null ? '—' : `${v.toFixed(1)} kg`);
const signed = (v, unit) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)} ${unit}`);

export default function PhasesSection() {
  const phases = useLiveQuery(() => getAllPhases(), [], []);
  const logs = useLiveQuery(() => getAllLogs(), [], []);
  const [openId, setOpenId] = useState(null);
  const today = todayStr();
  const open = phases.find((p) => p.id === openId);

  if (open) {
    const s = phaseSummary(logs, open, today);
    const rows = [
      ['Started', fmtDate(open.startDate)],
      ['Ended', open.endDate ? fmtDate(open.endDate) : 'ongoing'],
      ['Length', `${s.days} days · ${s.weeks.toFixed(1)} wk`],
      ['Weigh-ins', s.weighIns],
      ['Start → end weight', `${kg(s.startWeight)} → ${kg(s.endWeight)}`],
      ['Total change', signed(s.change, 'kg')],
      ['Trend per week', signed(s.perWeek, 'kg/wk')],
      ['Average weight', kg(s.avgWeight)],
      ['Average calories', s.avgCalories == null ? '—' : `${Math.round(s.avgCalories)} kcal (${s.calorieDays} days)`],
    ];
    return (
      <div className={card + ' flex flex-col gap-3'}>
        <div className="flex items-center justify-between">
          <button onClick={() => setOpenId(null)} className="flex items-center gap-1.5 text-zinc-400 text-sm">
            <ArrowLeft size={16} />
            {open.name}
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete phase "${open.name}"? Your logs stay.`)) {
                deletePhase(open.id);
                setOpenId(null);
              }
            }}
            className="text-zinc-600 active:text-red-400"
            aria-label="Delete phase"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="divide-y divide-zinc-800/80">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 text-sm">
              <span className="text-zinc-500">{k}</span>
              <span className="text-zinc-200 tabular-nums">{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={card + ' flex flex-col gap-2'}>
      <span className={label}>Phases</span>
      {phases.length === 0 && <p className="text-zinc-600 text-sm">No phases yet. Start one on the Log tab.</p>}
      <div className="divide-y divide-zinc-800/80">
        {[...phases].reverse().map((p) => {
          const weeks = (daysBetween(p.startDate, p.endDate || today) + 1) / 7;
          return (
            <button key={p.id} onClick={() => setOpenId(p.id)} className="w-full flex items-center justify-between py-2.5 text-left">
              <div className="flex flex-col">
                <span className="text-zinc-100 text-sm font-medium">{p.name}</span>
                <span className="text-zinc-500 text-xs">
                  {fmtDate(p.startDate)} – {p.endDate ? fmtDate(p.endDate) : 'now'} · {weeks.toFixed(1)} wk
                </span>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
