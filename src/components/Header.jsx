export default function Header({ title }) {
  return (
    <div className="flex items-center justify-between px-4 pt-5 pb-1 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
          <span className="text-black text-xs font-bold">L</span>
        </div>
        <span className="text-[13px] font-semibold text-zinc-500 tracking-wide">Ledger</span>
      </div>
      <h1 className="text-[13px] font-semibold text-zinc-300">{title}</h1>
    </div>
  );
}
