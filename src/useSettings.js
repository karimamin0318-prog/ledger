import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

const DEFAULTS = { theme: 'dark', steps: '', sex: 'm', age: '', height: '' };

export function useSettings() {
  const stored = useLiveQuery(async () => Object.fromEntries((await db.settings.toArray()).map((r) => [r.key, r.value])), [], {});
  return { ...DEFAULTS, ...stored };
}
