import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CloudUpload, X } from 'lucide-react';
import { db } from '../db';
import { saveBackup } from '../backup';
import { daysBetween, todayStr } from '../dates';
import { btnPrimary } from '../ui';

const EVERY_DAYS = 14;

/** Slides in from the top when there is data and the last backup is 14+ days old (or never happened). */
export default function BackupReminder({ lastBackup }) {
  const hasData = useLiveQuery(() => db.logs.count(), [], 0) > 0;
  const [dismissed, setDismissed] = useState(false);
  const days = lastBackup ? daysBetween(lastBackup, todayStr()) : null;
  if (!hasData || dismissed || (days != null && days < EVERY_DAYS)) return null;

  return (
    <div className="fixed top-3 inset-x-3 z-50 mx-auto max-w-[456px] animate-[slidedown_.3s_ease-out]">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <CloudUpload size={20} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="flex-1 text-sm text-zinc-200 leading-snug">
            {days == null ? 'You have never saved a backup.' : `No backup in ${days} days.`} Save one to your OneDrive so your data is safe.
          </p>
          <button onClick={() => setDismissed(true)} aria-label="Later" className="text-zinc-500">
            <X size={18} />
          </button>
        </div>
        <button onClick={async () => (await saveBackup()) && setDismissed(true)} className={btnPrimary + ' py-2.5 text-sm'}>
          Back up now
        </button>
      </div>
    </div>
  );
}
