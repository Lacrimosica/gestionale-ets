import i18n from '../i18n';

/**
 * Gets the correct locale to ensure DD/MM/YYYY and 24h clock.
 * Defaults to 'it-IT' if the app is in Italian, or 'en-GB' for English.
 */
const getLocale = () => (i18n.language === 'it' ? 'it-IT' : 'en-GB');

/**
 * Global formatting function for dates.
 * Standardizes to DD/MM/YYYY by default.
 */
export const formatDate = (
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(getLocale(), options);
};

/**
 * Global formatting function for time.
 * Standardizes to 24h clock (HH:MM) by default.
 */
export const formatTime = (
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false }
): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString(getLocale(), options);
};

/**
 * Formats a date in a long human-readable format (e.g., "1 April 2026").
 */
export const formatLongDate = (date: Date | string | number | null | undefined): string => {
  return formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Formats a date in a short version (e.g., "01/04").
 */
export const formatShortDate = (date: Date | string | number | null | undefined): string => {
  return formatDate(date, { day: '2-digit', month: '2-digit' });
};

/**
 * Formats a combined date and time string (e.g., "01/04/2026 - 15:56").
 */
export const formatDateTime = (date: Date | string | number | null | undefined): string => {
  if (!date) return '-';
  return `${formatDate(date)} - ${formatTime(date)}`;
};
