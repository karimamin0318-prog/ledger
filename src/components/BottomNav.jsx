import { PenLine, TrendingUp, Target, UploadCloud } from 'lucide-react';

const TABS = [
  { key: 'log', label: 'Log', Icon: PenLine },
  { key: 'analytics', label: 'Trends', Icon: TrendingUp },
  { key: 'goal', label: 'Goal', Icon: Target },
  { key: 'import', label: 'Import', Icon: UploadCloud },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="shrink-0 border-t border-zinc-900 bg-black/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5"
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? 'text-emerald-400' : 'text-zinc-600'}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
