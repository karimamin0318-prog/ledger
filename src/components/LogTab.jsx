import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, X, Plus, Scale, Flame } from 'lucide-react';
import { getAllLogs, getAllPhases, upsertWeight, upsertCalories, deleteField } from '../db';
import { logsInPhase } from '../calculations';
import { isValidWeight, isValidCalories } from '../importParser';
import Header from './Header';
import PhaseManager from './PhaseManager';
import { card, input, btnPrimary, label } from '../ui';
import { fmtShort, todayStr } from '../dates';

const FIELDS = [['morningWeightKg', 'kg'], ['caloriesConsumed', 'kcal']];
const BAD = ' !border-red-500/70';

export default function LogTab() {
  // null = today / yesterday, worked out on every render so a PWA left open overnight doesn't keep yesterday's date.
  const [weightDatePick, setWeightDate] = useState(null);
  const [calorieDatePick, setCalorieDate] = useState(null);
  const weightDate = weightDatePick ?? todayStr();
  const calorieDate = calorieDatePick ?? todayStr(-1);
  const [weightInput, setWeightInput] = useState('');
  const [calorieInput, setCalorieInput] = useState('');
  const [editing, setEditing] = useState(null); // { date, field }
  const [editValue, setEditValue] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [bad, setBad] = useState(null); // 'weight' | 'calories' | 'edit': that field holds a value out of range

  const [viewId, setViewId] = useState(null); // phase being browsed; null = the newest slot

  const logs = useLiveQuery(() => getAllLogs(), [], []);
  const phases = useLiveQuery(() => getAllPhases(), [], []);
  const activePhase = phases.find((p) => !p.endDate) || null;
  // One slot per phase, plus a "no active phase" slot at the end when nothing is running.
  const slots = activePhase ? phases : [...phases, null];
  const picked = slots.findIndex((p) => p && p.id === viewId);
  const viewIdx = picked >= 0 ? picked : slots.length - 1;
  const viewed = slots[viewIdx];
  const sortedDesc = [...logsInPhase(logs, viewed)].reverse();
  const visible = showAll ? sortedDesc : sortedDesc.slice(0, 7);

  async function submitWeight() {
    const v = parseFloat(weightInput);
    if (!isValidWeight(v)) return setBad('weight');
    await upsertWeight(weightDate, v);
    setWeightInput('');
    setWeightDate(null);
  }

  async function submitCalories() {
    const v = parseFloat(calorieInput);
    if (!isValidCalories(v)) return setBad('calories');
    await upsertCalories(calorieDate, v);
    setCalorieInput('');
    setCalorieDate(null);
  }

  async function saveEdit() {
    if (!editing) return;
    const { date, field } = editing; // capture now — `editing` may point elsewhere by the time this resolves
    const v = parseFloat(editValue);
    const ok = field === 'morningWeightKg' ? isValidWeight(v) : isValidCalories(v);
    if (!ok && editValue.trim()) return setBad('edit'); // keep the editor open so the typo can be fixed
    if (ok) await (field === 'morningWeightKg' ? upsertWeight : upsertCalories)(date, v);
    // Only close the editor if it's still the same cell — otherwise this stale
    // save (e.g. triggered by blurring into a different row) would clobber
    // whichever cell the user has since opened.
    setEditing((prev) => (prev && prev.date === date && prev.field === field ? null : prev));
  }

  async function remove(date, field) {
    if (window.confirm('Delete this entry?')) await deleteField(date, field);
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="Daily Log" />

      <div className="flex flex-col gap-4 px-4 pt-3">
        <PhaseManager
          phase={viewed}
          active={activePhase}
          hasPrev={viewIdx > 0}
          hasNext={viewIdx < slots.length - 1}
          onMove={(d) => setViewId(slots[viewIdx + d]?.id ?? null)}
          onStarted={() => setViewId(null)}
        />

        <div className={card + ' flex flex-col gap-3'}>
          <div className="flex items-center gap-2">
            <Scale size={15} className="text-emerald-400" />
            <span className={label}>Morning Weight</span>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={weightDate}
              max={todayStr()}
              onChange={(e) => setWeightDate(e.target.value || null)}
              className={input + ' w-[142px] shrink-0 !px-2.5 text-[14px] py-2.5 [color-scheme:dark]'}
            />
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weightInput}
              onChange={(e) => {
                setWeightInput(e.target.value);
                setBad(null);
              }}
              placeholder="kg"
              className={input + ' flex-1 min-w-0 text-center' + (bad === 'weight' ? BAD : '')}
            />
            <button onClick={submitWeight} className={btnPrimary + ' shrink-0 px-5'}>
              Save
            </button>
          </div>
          {weightDate !== todayStr() && (
            <span className="text-[11px] text-amber-400/80">Logging for {fmtShort(weightDate)}, not today</span>
          )}
        </div>

        <div className={card + ' flex flex-col gap-3'}>
          <div className="flex items-center gap-2">
            <Flame size={15} className="text-emerald-400" />
            <span className={label}>Calories</span>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={calorieDate}
              max={todayStr()}
              onChange={(e) => setCalorieDate(e.target.value || null)}
              className={input + ' w-[142px] shrink-0 !px-2.5 text-[14px] py-2.5 [color-scheme:dark]'}
            />
            <input
              type="number"
              inputMode="numeric"
              step="1"
              value={calorieInput}
              onChange={(e) => {
                setCalorieInput(e.target.value);
                setBad(null);
              }}
              placeholder="kcal"
              className={input + ' flex-1 min-w-0 text-center' + (bad === 'calories' ? BAD : '')}
            />
            <button onClick={submitCalories} className={btnPrimary + ' shrink-0 px-5'}>
              Save
            </button>
          </div>
          {calorieDate !== todayStr(-1) && (
            <span className="text-[11px] text-amber-400/80">Logging for {fmtShort(calorieDate)}, not yesterday</span>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <span className={label + ' mb-1.5 px-1'}>
            {showAll ? 'All Entries' : 'Last 7 Entries'}
            {viewed && ` · ${viewed.name}`}
          </span>
          {visible.length === 0 && (
            <p className="text-zinc-600 text-sm py-8 text-center">No entries yet.</p>
          )}
          <div className={card + ' !p-0 overflow-hidden divide-y divide-zinc-800/80'}>
            {visible.map((row) => (
              <div key={row.date} className="flex items-center gap-2 py-2.5 px-3.5 text-sm">
                <span className="w-9 text-zinc-500 shrink-0 text-xs">{fmtShort(row.date)}</span>
                {FIELDS.map(([field, unit]) => (
                  <Cell
                    key={field}
                    value={row[field]}
                    unit={unit}
                    editing={editing?.date === row.date && editing?.field === field}
                    invalid={bad === 'edit'}
                    editValue={editValue}
                    setEditValue={(v) => {
                      setEditValue(v);
                      setBad(null);
                    }}
                    onEdit={() => {
                      setEditing({ date: row.date, field });
                      setEditValue(String(row[field]));
                      setBad(null);
                    }}
                    onAdd={() => {
                      setEditing({ date: row.date, field });
                      setEditValue('');
                      setBad(null);
                    }}
                    onSave={saveEdit}
                    onCancel={() => {
                      setEditing(null);
                      setBad(null);
                    }}
                    onDelete={() => remove(row.date, field)}
                  />
                ))}
              </div>
            ))}
          </div>
          {sortedDesc.length > 7 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-emerald-400 text-center py-2.5"
            >
              {showAll ? 'Show less' : `Show all (${sortedDesc.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Cell({ value, unit, editing, invalid, editValue, setEditValue, onEdit, onAdd, onSave, onCancel, onDelete }) {
  if (editing) {
    return (
      <div className="flex-1 flex items-center gap-1.5">
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
          onBlur={onSave}
          placeholder={unit}
          className={`w-full bg-zinc-800 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 ${invalid ? 'ring-1 ring-red-500 focus:ring-red-500' : 'focus:ring-emerald-500'}`}
        />
        <button onMouseDown={(e) => e.preventDefault()} onClick={onSave} className="text-emerald-400 shrink-0">
          <Check size={16} />
        </button>
      </div>
    );
  }
  if (value == null) {
    return (
      <button onClick={onAdd} className="flex-1 flex items-center justify-center gap-1 text-zinc-700 active:text-emerald-400 text-xs">
        <Plus size={12} />
        add
      </button>
    );
  }
  return (
    <button onClick={onEdit} className="flex-1 text-right text-zinc-200 flex items-center justify-end gap-2">
      <span className="tabular-nums">
        {value}
        <span className="text-zinc-500 text-[11px] ml-0.5">{unit}</span>
      </span>
      <span
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-zinc-700 active:text-red-400"
      >
        <X size={14} />
      </span>
    </button>
  );
}
