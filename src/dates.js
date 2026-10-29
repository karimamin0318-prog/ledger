const DAY_MS = 86400000;

export function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function toDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(a, b) {
  return Math.round((toDate(b) - toDate(a)) / DAY_MS);
}

export function addDays(dateStr, delta) {
  const dt = toDate(dateStr);
  dt.setDate(dt.getDate() + delta);
  return toDateStr(dt);
}

/** "2026-08-24" -> "24.08" */
export function fmtShort(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${d}.${m}`;
}

/** "2026-08-24" -> "24.08.2026" */
export function fmtFull(dateStr) {
  return dateStr.split('-').reverse().join('.');
}
