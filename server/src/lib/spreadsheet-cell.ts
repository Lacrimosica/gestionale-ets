/**
 * Spreadsheet apps execute cells starting with these characters as formulas
 * (CSV/TSV injection). The apostrophe is included so that escaping round-trips:
 * a value that genuinely starts with "'" is escaped too and restored on import.
 */
const RISKY_FIRST_CHARS = new Set(['=', '+', '-', '@', '\t', '\r', "'"]);

/** Prefix a cell with an apostrophe when a spreadsheet would treat it as a formula. */
export function protectCell(value: string): string {
  return value.length > 0 && RISKY_FIRST_CHARS.has(value[0]) ? `'${value}` : value;
}

/** Undo {@link protectCell} for values read back from an exported file. */
export function unprotectCell(value: string): string {
  return value.length > 1 && value[0] === "'" && RISKY_FIRST_CHARS.has(value[1]) ? value.slice(1) : value;
}
