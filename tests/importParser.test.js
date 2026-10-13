import { describe, it, expect } from 'vitest';
import { parseLine, parseImportText, isValidWeight } from '../src/importParser';

describe('parseLine', () => {
  it('reads day-first dates with a dash separator', () => {
    expect(parseLine('24.08.26 – 80')).toEqual({ date: '2026-08-24', kg: 80 });
  });
  it('reads ISO dates and decimal commas', () => {
    expect(parseLine('2026-8-5, 79,4')).toEqual({ date: '2026-08-05', kg: 79.4 });
  });
  it('rejects impossible dates, 3-digit years and absurd weights', () => {
    expect(parseLine('31.02.26 80')).toBeNull();
    expect(parseLine('9/1/202 80')).toBeNull();
    expect(parseLine('24.08.26 800')).toBeNull();
  });
});

describe('parseImportText', () => {
  it('lets later duplicate dates win and reports failed lines', () => {
    const r = parseImportText('24.08.26 80\n24.08.26 81\nnonsense');
    expect(r.entries).toEqual([{ date: '2026-08-24', kg: 81 }]);
    expect(r.failedLines).toEqual(['nonsense']);
  });
});

it('isValidWeight', () => {
  expect(isValidWeight(80)).toBe(true);
  expect(isValidWeight(NaN)).toBe(false);
  expect(isValidWeight(0.5)).toBe(false);
});
