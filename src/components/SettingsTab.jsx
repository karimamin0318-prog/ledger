import { useRef, useState } from 'react';
import { ArrowLeft, Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { THEMES, saveSetting, importBackup } from '../db';
import { saveBackup } from '../backup';
import { useSettings } from '../hooks';
import ImportCard from './ImportCard';
import PhasesSection from './PhasesSection';
import { card, btnSecondary, label } from '../ui';
import { fmtFull } from '../dates';

export default function SettingsTab() {
  const { theme, lastBackup } = useSettings();
  const [msg, setMsg] = useState(null); // { ok, text }
  const fileRef = useRef(null);

  async function restore(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.text().then(JSON.parse).catch(() => null); // not JSON: importBackup says "Not a Ledger backup"
      const n = await importBackup(data);
      setMsg({ ok: true, text: `Restored ${n.logs} entries and ${n.phases} new phase${n.phases === 1 ? "" : "s"}.` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
    e.target.value = '';
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex items-center gap-3 px-4 pt-5 pb-1 shrink-0">
        <a href="#" aria-label="Back" className="text-zinc-400 active:text-emerald-400">
          <ArrowLeft size={20} />
        </a>
        <h1 className="text-[15px] font-semibold text-zinc-200">Settings</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-3 pb-8">
        <div className={card + ' flex flex-col gap-3'}>
          <span className={label}>Design</span>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(THEMES).map(([key, name]) => (
              <button
                key={key}
                onClick={() => saveSetting('theme', key)}
                className={`py-2.5 rounded-xl text-xs font-medium border ${
                  theme === key ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-zinc-950/30 text-zinc-400 border-zinc-800'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <PhasesSection />

        <div className={card + ' flex flex-col gap-3'}>
          <span className={label}>Backup</span>
          <p className="text-[12px] text-zinc-500 leading-relaxed">
            One file with everything you entered: weights, calories, phases and settings. Restoring never deletes; values in the file replace the same days and your settings.
            <br />
            Last backup: <span className="text-zinc-300">{lastBackup ? fmtFull(lastBackup) : 'never'}</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={saveBackup} className={btnSecondary + ' flex items-center justify-center gap-2 py-2.5 text-sm'}>
              <Download size={15} />
              Export
            </button>
            <button onClick={() => fileRef.current?.click()} className={btnSecondary + ' flex items-center justify-center gap-2 py-2.5 text-sm'}>
              <Upload size={15} />
              Restore
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".txt,.json,text/plain,application/json" onChange={restore} className="hidden" />
          {msg && (
            <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${msg.ok ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
              {msg.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              {msg.text}
            </div>
          )}
        </div>

        <ImportCard />
      </div>
    </div>
  );
}
