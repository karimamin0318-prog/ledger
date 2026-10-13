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

export default function AnalyticsTab() {
  const { phases, phaseId, setPhaseId, scopedLogs } = usePhaseScope();

  const rolling = rollingAverage(scopedLogs);
  const weekly = groupByWeek(scopedLogs)
    .filter((w) => w.avgWeight != null)
    .map((w) => ({ ...w, label: fmtShort(w.weekStart) }));
  const latest = rolling.at(-1);
  const xs = rolling.map((r) => daysBetween(rolling[0].date, r.date));

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
              <Plot
                xs={xs}
                lines={[
                  { values: rolling.map((r) => r.raw), color: muted, width: 1.5 },
                  { values: rolling.map((r) => r.avg), color: accentDim, width: 2.5 },
                ]}
                xLabels={[fmtShort(rolling[0].date), fmtShort(latest.date)]}
              />
              <span className="text-zinc-500 text-xs">
                Latest {latest.raw.toFixed(1)} kg · 7-day avg {latest.avg.toFixed(1)} kg
              </span>
            </section>

            <section className={card + ' flex flex-col gap-3'}>
              <h2 className={sectionTitle}>Weekly Average</h2>
              {weekly.length > 1 ? (
                <Plot bars={weekly.map((w) => w.avgWeight)} xLabels={[weekly[0].label, weekly.at(-1).label]} />
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

/** Tiny SVG chart: lines over day offsets `xs`, or one bar per value. Y axis fits the data ±0.5 kg. */
function Plot({ xs, lines, bars, xLabels }) {
  const all = bars ?? lines.flatMap((l) => l.values);
  const lo = Math.floor(Math.min(...all) - 0.5);
  const hi = Math.ceil(Math.max(...all) + 0.5);
  const y = (v) => 100 - ((v - lo) / (hi - lo)) * 100;
  const span = xs ? Math.max(1, xs.at(-1)) : 1;
  const x = (d) => (d / span) * 100;
  const grid = [lo, (lo + hi) / 2, hi];

  return (
    <div className="flex gap-2">
      <div className="flex flex-col justify-between text-[10px] text-zinc-500 tabular-nums h-40 py-0 -my-1.5">
        {[...grid].reverse().map((g) => <span key={g}>{g.toFixed(1)}</span>)}
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full overflow-visible">
          {grid.map((g) => (
            <line key={g} x1="0" x2="100" y1={y(g)} y2={y(g)} stroke="var(--color-zinc-800)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {lines?.map(({ values, color, width }) => (
            <polyline
              key={color}
              // A single point gets a tiny segment so it stays visible.
              points={values.length === 1 ? `49,${y(values[0])} 51,${y(values[0])}` : values.map((v, i) => `${x(xs[i])},${y(v)}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={width}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {bars?.map((v, i) => {
            const w = 100 / bars.length;
            return <rect key={i} x={i * w + w * 0.15} width={w * 0.7} y={y(v)} height={100 - y(v)} fill={accentDim} rx="0.6" />;
          })}
        </svg>
        <div className="flex justify-between text-[10px] text-zinc-500">
          {xLabels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      </div>
    </div>
  );
}
