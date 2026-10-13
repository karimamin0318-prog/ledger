const DATE_TOKEN = /(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./]\d{1,2}[./]\d{2,4})/;
const NUMBER_TOKEN = /(\d+(?:[.,]\d+)?)/;

function normalizeDate(token) {
  if (/^\d{4}-/.test(token)) {
    const [y, m, d] = token.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const [d, m, yRaw] = token.split(/[./]/);
  const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function isValidCalendarDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Parses one line of pasted/uploaded text into { date, kg } or null if unparseable. */
export function parseLine(rawLine) {
  const line = rawLine.trim();
  if (!line) return null;

  const dateMatch = line.match(DATE_TOKEN);
  if (!dateMatch) return null;

  const iso = normalizeDate(dateMatch[1]);
  if (!isValidCalendarDate(iso)) return null;

  const rest = line.slice(dateMatch.index + dateMatch[0].length);
  const numMatch = rest.match(NUMBER_TOKEN);
  if (!numMatch) return null;

  const kg = parseFloat(numMatch[1].replace(',', '.'));
  if (isNaN(kg) || kg < 20 || kg > 400) return null;

  return { date: iso, kg };
}

/** Parses a whole block of text, returning { entries, failedLines }. Later duplicate dates win. */
export function parseImportText(text) {
  const lines = text.split(/\r?\n/);
  const byDate = new Map();
  const failedLines = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const parsed = parseLine(line);
    if (parsed) byDate.set(parsed.date, parsed.kg);
    else failedLines.push(line);
  }

  const entries = Array.from(byDate.entries())
    .map(([date, kg]) => ({ date, kg }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return { entries, failedLines };
}
