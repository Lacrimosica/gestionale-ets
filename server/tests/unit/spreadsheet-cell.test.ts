import { describe, it, expect } from 'vitest';
import { protectCell, unprotectCell } from '../../src/lib/spreadsheet-cell';

describe('spreadsheet cell protection', () => {
  it('neutralises formula-like cells', () => {
    expect(protectCell('=HYPERLINK("http://x")')).toBe(`'=HYPERLINK("http://x")`);
    expect(protectCell('+39 333 1234567')).toBe(`'+39 333 1234567`);
    expect(protectCell('-5')).toBe(`'-5`);
    expect(protectCell('@SUM(A1)')).toBe(`'@SUM(A1)`);
  });

  it('leaves ordinary values alone', () => {
    expect(protectCell('Mario Rossi')).toBe('Mario Rossi');
    expect(protectCell('2025-01-01')).toBe('2025-01-01');
    expect(protectCell('')).toBe('');
    expect(unprotectCell("l'Aquila")).toBe("l'Aquila");
  });

  it('round-trips every value, including ones that start with an apostrophe', () => {
    for (const v of ['=1+1', '+39', '-', "'", "'=x", "''", "l'Aquila", 'plain', '']) {
      expect(unprotectCell(protectCell(v))).toBe(v);
    }
  });
});
