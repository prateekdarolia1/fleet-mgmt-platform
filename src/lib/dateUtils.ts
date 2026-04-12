/**
 * Format a date as DD/MM/YYYY — the standard display format for this app.
 * Handles Date objects, ISO strings, and null/undefined gracefully.
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format a date as "Weekday, DD/MM/YYYY" (e.g. "Saturday, 12/04/2026").
 * Used in dashboard headers.
 */
export const formatDateWithWeekday = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'long' });
  return `${weekday}, ${formatDate(d)}`;
};
