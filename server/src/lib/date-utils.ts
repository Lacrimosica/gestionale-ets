export function subtract14Days(d: Date): Date {
  return new Date(d.getTime() - 14 * 24 * 60 * 60 * 1000);
}

export function add35Minutes(d: Date): Date {
  return new Date(d.getTime() + 35 * 60 * 1000);
}

export function add2Hours(d: Date): Date {
  return new Date(d.getTime() + 2 * 60 * 60 * 1000);
}

export function add1Year(d: Date): Date {
  return new Date(d.getTime() + 365 * 24 * 60 * 60 * 1000);
}

// dd/mm/yyyy — matches toLocaleDateString('it-it') from the original Apps Scripts
export function formatItalianDate(d: Date): string {
  return d.toLocaleDateString('it-IT');
}

// HH:MM — 24h format
export function formatItalianTime(d: Date): string {
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false });
}
