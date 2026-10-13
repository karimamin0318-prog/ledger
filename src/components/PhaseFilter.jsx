import { ChevronDown } from 'lucide-react';
import { fmtShort } from '../dates';

export default function PhaseFilter({ phases, value, onChange }) {
  if (!phases.length) return null;

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-zinc-950/40 border border-zinc-800 rounded-lg pl-3 pr-8 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50"
      >
        <option value="all">All Time</option>
        {phases.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {!p.endDate ? ' (current)' : ` (${fmtShort(p.startDate)}–${fmtShort(p.endDate)})`}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
    </div>
  );
}
