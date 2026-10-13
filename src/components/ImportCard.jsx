import { useRef, useState } from 'react';
import { FileUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { bulkImportWeights } from '../db';
import { parseImportText } from '../importParser';
import { card, input, btnPrimary, btnSecondary, label } from '../ui';

function fmtFull(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

export default function ImportCard() {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null); // { entries, failedLines }
  const [done, setDone] = useState(null); // count imported
  const fileRef = useRef(null);

  function handlePreview(value) {
    setText(value);
    setDone(null);
    setParsed(value.trim() ? parseImportText(value) : null);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handlePreview(String(reader.result || ''));
    reader.readAsText(file);
  }

  async function confirmImport() {
    if (!parsed?.entries.length) return;
    await bulkImportWeights(parsed.entries);
    setDone(parsed.entries.length);
    setText('');
    setParsed(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <>
      <div className={card + ' flex flex-col gap-3'}>
        <span className={label}>Import past weights</span>
        <p className="text-[12px] text-zinc-500 leading-relaxed">
          One entry per line, e.g. <code className="text-zinc-400">2026-08-24, 80.0</code> or{' '}
          <code className="text-zinc-400">24.08.26 – 80</code>. Existing data is never deleted — this only fills in weights.
        </p>
        <textarea
          value={text}
          onChange={(e) => handlePreview(e.target.value)}
          rows={5}
          placeholder={'2026-08-24, 80.0\n2026-08-25, 80.4\n24.08.26 – 80.2'}
          className={input + ' resize-none font-mono text-[13px] leading-relaxed'}
        />
        <button onClick={() => fileRef.current?.click()} className={btnSecondary + ' flex items-center justify-center gap-2 py-2.5 text-sm'}>
          <FileUp size={15} />
          Upload .csv / .txt file
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
      </div>

      {parsed && (
        <div className={card + ' flex flex-col gap-3'}>
          <div className="flex items-center justify-between">
            <span className={label}>Preview</span>
            <span className="text-xs text-emerald-400 font-medium">{parsed.entries.length} entries found</span>
          </div>
          {parsed.failedLines.length > 0 && (
            <div className="flex items-start gap-2 text-amber-400/90 text-xs bg-amber-500/10 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{parsed.failedLines.length} line(s) could not be read and will be skipped.</span>
            </div>
          )}
          {parsed.entries.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-800/80 divide-y divide-zinc-800/80">
              {parsed.entries.map((e) => (
                <div key={e.date} className="flex justify-between px-3 py-1.5 text-sm">
                  <span className="text-zinc-400">{fmtFull(e.date)}</span>
                  <span className="text-zinc-100 tabular-nums">{e.kg} kg</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={confirmImport}
            disabled={!parsed.entries.length}
            className={btnPrimary + ' py-3 disabled:opacity-40 disabled:pointer-events-none'}
          >
            Import {parsed.entries.length || ''} {parsed.entries.length === 1 ? 'Entry' : 'Entries'}
          </button>
        </div>
      )}

      {done != null && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} />
          Imported {done} {done === 1 ? 'entry' : 'entries'} successfully.
        </div>
      )}
    </>
  );
}
