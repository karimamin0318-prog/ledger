import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllLogs, getAllPhases } from '../db';
import { computeAdaptiveTDEE, goalTargetCalories, GOALS, MIN_DAYS_FOR_TDEE, logsInPhase } from '../calculations';
import Header from './Header';
import PhaseFilter from './PhaseFilter';
import { card, sectionTitle, label } from '../ui';

const GOAL_ORDER = Object.keys(GOALS);

function fmt1(n) {
  return n == null ? '—' : n.toFixed(1);
}

export default function CalculatorTab() {
  const [goal, setGoal] = useState('maintain');
  const [selected, setSelected] = useState(null); // null = auto (current phase, or all time)
  const logs = useLiveQuery(() => getAllLogs(), [], []);
  const phases = useLiveQuery(() => getAllPhases(), [], []);

  if (!logs || !phases) return null;

  const activePhase = phases.find((p) => !p.endDate) || null;
  const effectiveId = selected ?? (activePhase ? String(activePhase.id) : 'all');
  const selectedPhase = effectiveId === 'all' ? null : phases.find((p) => String(p.id) === effectiveId) || null;
  const scopedLogs = logsInPhase(logs, selectedPhase);

  const result = computeAdaptiveTDEE(scopedLogs);

  function pickGoal(key) {
    if (key === 'gain_fast') {
      window.alert("You can't gain fast, you fat fuck");
      return;
    }
    setGoal(key);
  }

  const progressPct = Math.min(100, (result.daysElapsed / result.needed) * 100);
  const missingCalories = Math.max(0, 7 - result.calorieCount);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="TDEE & Goal" />

      <div className="flex flex-col gap-4 px-4 pt-3 pb-4">
        <div className="flex justify-end -mt-1">
          <PhaseFilter phases={phases} value={effectiveId} onChange={setSelected} />
        </div>

        <div className={card + ' flex flex-col items-center gap-1 py-6'}>
          <span className={label}>Your True TDEE</span>
          <span className="text-5xl font-bold text-white tabular-nums mt-1">
            {result.ready ? Math.round(result.tdee).toLocaleString() : '—'}
          </span>

          {result.ready ? (
            <span className="text-zinc-500 text-xs mt-1">kcal / day · based on {result.daysElapsed} days</span>
          ) : (
            <div className="flex flex-col items-center gap-2 mt-2 w-full">
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden max-w-[220px]">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-zinc-500 text-xs text-center">
                {result.daysElapsed} / {result.needed} days logged
                {result.reason === 'calories' && ` · ${missingCalories} more calorie ${missingCalories === 1 ? 'entry' : 'entries'} needed`}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Avg Intake" value={result.avgCalories == null ? '—' : Math.round(result.avgCalories)} unit="kcal" />
          <Stat
            label="Weight Δ"
            value={result.deltaWeight == null ? '—' : (result.deltaWeight >= 0 ? '+' : '') + fmt1(result.deltaWeight)}
            unit="kg"
          />
          <Stat label="Current Wt" value={fmt1(result.currentWeight)} unit="kg" />
        </div>

        <div className={card + ' flex flex-col gap-3'}>
          <span className={sectionTitle}>Goal</span>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_ORDER.map((key) => (
              <button
                key={key}
                onClick={() => pickGoal(key)}
                className={`py-2.5 rounded-xl text-xs font-medium border transition-all duration-150 active:scale-[0.96] ${
                  goal === key
                    ? 'bg-emerald-500 text-black border-emerald-500'
                    : 'bg-black/30 text-zinc-400 border-zinc-800'
                }`}
              >
                {GOALS[key].label}
              </button>
            ))}
          </div>
        </div>

        <div className={card + ' flex flex-col items-center gap-1 py-6'}>
          <span className={label}>{GOALS[goal].label} Target</span>
          <span className="text-4xl font-bold text-emerald-400 tabular-nums mt-1">
            {result.ready ? Math.round(goalTargetCalories(result.tdee, result.currentWeight, goal)).toLocaleString() : '—'}
          </span>
          <span className="text-zinc-500 text-xs mt-1">
            {result.ready ? 'kcal / day' : `Needs your TDEE (${MIN_DAYS_FOR_TDEE}+ days of data) first`}
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label: text, value, unit }) {
  return (
    <div className={card + ' !p-2.5 flex flex-col items-center'}>
      <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{text}</span>
      <span className="text-sm font-semibold text-white mt-0.5 tabular-nums">
        {value} <span className="text-[10px] text-zinc-500 font-normal">{unit}</span>
      </span>
    </div>
  );
}
