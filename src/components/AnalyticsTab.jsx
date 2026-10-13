import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts';
import { rollingAverage, groupByWeek } from '../calculations';
import { usePhaseScope } from '../hooks';
import Header from './Header';
import PhaseFilter from './PhaseFilter';
import { card, sectionTitle, label, accentDim, muted } from '../ui';
import { fmtShort, daysBetween } from '../dates';

function fmtDelta(delta) {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)} kg`;
}

const tooltipStyle = {
  background: 'var(--color-zinc-900)',
  border: '1px solid var(--color-zinc-800)',
  borderRadius: 10,
  fontSize: 12,
  padding: '6px 10px',
};
const tick = { fontSize: 10, fill: 'var(--color-zinc-500)' };
// Round the y-axis to whole kg so the ticks read 77 / 78 / 79 instead of 78.1 / 80.1.
const yDomain = [(min) => Math.floor(min - 0.5), (max) => Math.ceil(max + 0.5)];
const fmt1 = (v) => v.toFixed(1);

export default function AnalyticsTab() {
  const { phases, phaseId, setPhaseId, scopedLogs } = usePhaseScope();

  const rolling = rollingAverage(scopedLogs).map((r) => ({ ...r, label: fmtShort(r.date) }));
  const weekly = groupByWeek(scopedLogs)
    .filter((w) => w.avgWeight != null)
    .map((w) => ({ ...w, label: fmtShort(w.weekStart) }));
  const latest = rolling.at(-1);

  const hasData = rolling.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="Trends" />

      <div className="flex flex-col gap-4 px-4 pt-3 pb-4">
        <div className="flex justify-end -mt-1">
          <PhaseFilter phases={phases} value={phaseId} onChange={setPhaseId} />
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
                  {/* accessibilityLayer off: it makes the chart focusable, which draws a white focus ring on tap */}
                  <LineChart data={rolling} accessibilityLayer={false} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--color-zinc-800)" strokeOpacity={0.5} vertical={false} />
                    <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" axisLine={{ stroke: 'var(--color-zinc-800)' }} tickLine={false} />
                    <YAxis tick={tick} tickFormatter={fmt1} domain={yDomain} width={32} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--color-zinc-200)' }} formatter={fmt1} cursor={{ stroke: 'var(--color-zinc-700)' }} />
                    <Line type="monotone" dataKey="raw" name="Daily" stroke={muted} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="avg" name="7-day avg" stroke={accentDim} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <span className="text-zinc-500 text-xs">
                Latest {latest.raw.toFixed(1)} kg · 7-day avg {latest.avg.toFixed(1)} kg
              </span>
            </section>

            <section className={card + ' flex flex-col gap-3'}>
              <h2 className={sectionTitle}>Weekly Average</h2>
              {weekly.length ? (
                <div className="h-40 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekly} accessibilityLayer={false} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="var(--color-zinc-800)" strokeOpacity={0.5} vertical={false} />
                      <XAxis dataKey="label" tick={tick} axisLine={{ stroke: 'var(--color-zinc-800)' }} tickLine={false} />
                      <YAxis tick={tick} tickFormatter={fmt1} domain={yDomain} width={32} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--color-zinc-200)' }} formatter={fmt1} cursor={{ fill: 'var(--color-zinc-800)', fillOpacity: 0.4 }} />
                      <Bar dataKey="avgWeight" name="Avg" fill={accentDim} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-zinc-600 text-xs text-center py-8">Not enough data yet.</p>
              )}
            </section>

            <section className={card + ' flex flex-col gap-1'}>
              <h2 className={sectionTitle + ' mb-2'}>Week-over-Week</h2>
              {weekly.length ? (
                <div className="rounded-xl border border-zinc-800/80 divide-y divide-zinc-800/80 overflow-hidden">
                  <div className="flex px-3 py-2 bg-zinc-950/20">
                    <span className={label + ' flex-1'}>Week</span>
                    <span className={label + ' w-16 text-right'}>Avg</span>
                    <span className={label + ' w-20 text-right'}>Change</span>
                  </div>
                  {weekly.map((w, i) => {
                    const prev = i > 0 ? weekly[i - 1] : null;
                    const delta = prev ? w.avgWeight - prev.avgWeight : null;
                    const gapWeeks = prev ? daysBetween(prev.weekStart, w.weekStart) / 7 : 1; // >1 when weeks had no weigh-ins
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
                          {gapWeeks > 1 && <span className="text-zinc-600"> ·{gapWeeks}w</span>}
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

