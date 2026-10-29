// Shared style tokens so every tab reads from the same design language.
// Shapes and shadows come from CSS variables (src/index.css) so a theme can restyle them.
export const card =
  'bg-zinc-900/(--card-alpha) border border-zinc-800/80 rounded-(--card-radius) p-4 shadow-(--card-shadow) [backdrop-filter:var(--card-filter)]';
export const input =
  'bg-zinc-950/40 border border-zinc-800 rounded-(--field-radius) px-4 py-3 text-[17px] text-white placeholder-zinc-600 ' +
  'focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-colors';
export const btnPrimary =
  'bg-emerald-500 text-black font-semibold rounded-(--field-radius) active:scale-[0.97] active:bg-emerald-400 transition-all duration-150 shadow-(--btn-shadow)';
export const btnSecondary =
  'bg-zinc-900 border border-zinc-800 text-zinc-300 active:scale-[0.97] active:bg-zinc-800 rounded-(--field-radius) transition-all duration-150';
export const label = 'text-[11px] font-semibold text-zinc-500 uppercase tracking-wider';
export const sectionTitle = 'text-[13px] font-semibold text-zinc-300';
export const accentDim = 'var(--color-emerald-400)';
export const muted = 'var(--color-zinc-600)';

export const fmt1 = (v) => (v == null ? '—' : v.toFixed(1));
/** (1.23, 'kg') -> "+1.2 kg" */
export const signed = (v, unit = '') => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}${unit && ` ${unit}`}`);
