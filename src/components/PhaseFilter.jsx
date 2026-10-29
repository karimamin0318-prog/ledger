import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { fmtShort } from '../dates';

const range = (p) => (p.endDate ? `${fmtShort(p.startDate)} – ${fmtShort(p.endDate)}` : `since ${fmtShort(p.startDate)}`);

/** Phase picker for Trends and Goal: an in-app menu (not the system picker), newest phase first. */
export default function PhaseFilter({ phases, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!phases.length) return null;

  const current = phases.find((p) => String(p.id) === value);
  const items = [
    { id: 'all', name: 'All Time', sub: 'every entry' },
    ...[...phases].reverse().map((p) => ({ id: String(p.id), name: p.name, sub: range(p), live: !p.endDate })),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 max-w-[200px] bg-zinc-950/40 border border-zinc-800 rounded-(--field-radius) pl-3 pr-2.5 py-1.5 text-xs text-zinc-300"
      >
        <span className="truncate">{current ? current.name : 'All Time'}</span>
        <ChevronDown size={12} className={`shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 z-30 w-64 max-h-80 overflow-y-auto p-1 bg-zinc-900 border border-zinc-800 rounded-(--card-radius) shadow-2xl animate-[menu_.12s_ease-out]"
        >
          {items.map((it) => {
            const selected = it.id === value;
            return (
              <button
                key={it.id}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(it.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-(--field-radius) text-left ${selected ? 'bg-zinc-800/70' : 'active:bg-zinc-800/50'}`}
              >
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-sm text-zinc-100 truncate">
                    {it.name}
                    {it.live && <span className="ml-1.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">current</span>}
                  </span>
                  <span className="text-[11px] text-zinc-500">{it.sub}</span>
                </span>
                {selected && <Check size={14} className="shrink-0 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
