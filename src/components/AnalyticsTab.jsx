import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts';
import { getAllLogs, getAllPhases } from '../db';
import { rollingAverage, groupByWeek, logsInPhase } from '../calculations';
import Header from './Header';
import PhaseFilter from './PhaseFilter';
import { card, sectionTitle, label, accentDim, muted } from '../ui';

function fmtShort(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${d}.${m}`;
}

function fmtDelta(delta) {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)} kg`;
}

const tooltipStyle = {
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: 10,
  fontSize: 12,
  padding: '6px 10px',
};

export default function AnalyticsTab() {
  const logs = useLiveQuery(() => getAllLogs(), [], []);
  const phases = useLiveQuery(() => getAllPhases(), [], []);
  const [selected, setSelected] = useState(null); // null = auto (current phase, or all time)

  if (!logs || !phases) return null;

  const activePhase = phases.find((p) => !p.endDate) || null;
  const effectiveId = selected ?? (activePhase ? String(activePhase.id) : 'all');
  const selectedPhase = effectiveId === 'all' ? null : phases.find((p) => String(p.id) === effectiveId) || null;
  const scopedLogs = logsInPhase(logs, selectedPhase);

  const rolling = rollingAverage(scopedLogs).map((r) => ({ ...r, label: fmtShort(r.date) }));
  const weekly = groupByWeek(scopedLogs)
    .filter((w) => w.avgWeight != null)
    .map((w) => ({ ...w, label: fmtShort(w.weekStart) }));

  const hasData = rolling.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="Trends" />

      <div className="flex flex-col gap-4 px-4 pt-3 pb-4">
        <div className="flex justify-end -mt-1">
          <PhaseFilter phases={phases} value={effectiveId} onChange={setSelected} />
        </div>

        {!hasData && (
          <div className={card}>
            <p className="text-zinc-600 text-sm text-center py-8">Log a few morning weights to see your trend.</p>
          </div>
        )}

        {hasData && (
          <>
            <section className={card + ' flex flex-col gap-3'}>
              <div className="flex items-baseline justify-between">
                <h2 className={sectionTitle}>Daily Weight</h2>
                <Legend items={[[muted, 'Daily'], [accentDim, '7-day avg']]} />
              </div>
              <div className="h-44 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rolling} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#1c1c1f" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} interval="preserveStartEnd" axisLine={{ stroke: '#27272a' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => v.toFixed(1)} domain={['dataMin - 1', 'dataMax + 1']} width={32} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#e4e4e7' }} formatter={(v) => v.toFixed(1)} />
                    <Line type="monotone" dataKey="raw" stroke={muted} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="avg" stroke={accentDim} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className={card + ' flex flex-col gap-3'}>
              <h2 className={sectionTitle}>Weekly Average</h2>
              <div className="h-40 -ml-2">
                {weekly.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekly} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#1c1c1f" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={{ stroke: '#27272a' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => v.toFixed(1)} domain={['dataMin - 1', 'dataMax + 1']} width={32} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#e4e4e7' }} formatter={(v) => v.toFixed(1)} />
                      <Bar dataKey="avgWeight" fill={accentDim} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-zinc-600 text-xs text-center py-8">Not enough data yet.</p>
                )}
              </div>
            </section>

            <section className={card + ' flex flex-col gap-1'}>
              <h2 className={sectionTitle + ' mb-2'}>Week-over-Week</h2>
              {weekly.length ? (
                <div className="rounded-xl border border-zinc-800/80 divide-y divide-zinc-800/80 overflow-hidden">
                  <div className="flex px-3 py-2 bg-black/20">
                    <span className={label + ' flex-1'}>Week</span>
                    <span className={label + ' w-16 text-right'}>Avg</span>
                    <span className={label + ' w-20 text-right'}>Change</span>
                  </div>
                  {weekly.map((w, i) => {
                    const prev = i > 0 ? weekly[i - 1].avgWeight : null;
                    const delta = prev != null ? w.avgWeight - prev : null;
                    return (
                      <div key={w.weekStart} className="flex items-center px-3 py-2.5 text-sm">
                        <div className="flex-1 flex flex-col">
                          <span className="text-zinc-200 font-medium">Week {i + 1}</span>
                          <span className="text-zinc-600 text-[11px]">from {w.label}</span>
                        </div>
                        <span className="w-16 text-right text-zinc-200 tabular-nums">{w.avgWeight.toFixed(1)}</span>
                        <span
                          className={`w-20 text-right tabular-nums text-[13px] ${
                            delta == null ? 'text-zinc-600' : delta < -0.02 ? 'text-emerald-400' : delta > 0.02 ? 'text-amber-400' : 'text-zinc-500'
                          }`}
                        >
                          {delta == null ? '—' : fmtDelta(delta)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-zinc-600 text-xs text-center py-6">Not enough data yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex gap-3">
      {items.map(([color, text]) => (
        <span key={text} className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
          {text}
        </span>
      ))}
    </div>
  );
}
