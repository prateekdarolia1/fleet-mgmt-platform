/**
 * Date transformation and calculation functions
 *
 * Implements business logic for maintenance date calculation
 * and other date-related transformations.
 */

/**
 * Calculates the next maintenance date based on delivery date
 *
 * Business Rule:
 * - If delivery_date + 90 days is in the future → use that date
 * - If delivery_date + 90 days is in the past → use today + 7 days (overdue case)
 *
 * This ensures vehicles delivered long ago get immediate maintenance scheduling
 * while newly delivered vehicles follow the standard 90-day cycle.
 *
 * @param deliveryDate - Delivery date in YYYY-MM-DD format or Date object
 * @returns Next maintenance date in YYYY-MM-DD format
 *
 * @example
 * // Delivered recently (2024-12-01, current date: 2024-12-21)
 * calculateMaintenanceDate("2024-12-01")
 * // → "2025-03-01" (90 days from delivery, in future)
 *
 * @example
 * // Delivered long ago (2024-01-01, current date: 2024-12-21)
 * calculateMaintenanceDate("2024-01-01")
 * // → "2024-12-28" (today + 7 days, overdue case)
 */
export function calculateMaintenanceDate(deliveryDate: string | Date): string {
  // Parse delivery date
  const delivery = typeof deliveryDate === 'string'
    ? new Date(deliveryDate)
    : deliveryDate;

  // Calculate delivery + 90 days
  const maintenance90Days = new Date(delivery);
  maintenance90Days.setDate(maintenance90Days.getDate() + 90);

  // Get today's date (without time component for accurate comparison)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Smart calculation based on whether 90-day date is in future or past
  if (maintenance90Days > today) {
    // Future date - use the standard 90-day schedule
    return maintenance90Days.toISOString().split('T')[0];
  } else {
    // Past date (overdue) - schedule for 7 days from now
    const overdueDate = new Date(today);
    overdueDate.setDate(overdueDate.getDate() + 7);
    return overdueDate.toISOString().split('T')[0];
  }
}

/**
 * Validates that a date string is in YYYY-MM-DD format
 *
 * @param dateString - Date string to validate
 * @returns True if valid YYYY-MM-DD format, false otherwise
 *
 * @example
 * isValidDateFormat("2024-01-15")  // → true
 * isValidDateFormat("15/01/2024")  // → false
 * isValidDateFormat("2024-1-5")    // → false (no zero-padding)
 */
export function isValidDateFormat(dateString: string): boolean {
  // Check format YYYY-MM-DD with regex
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  // Check if it's a valid date
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Checks if a date is in the future
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns True if date is in the future
 */
export function isFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Remove time component

  return date > today;
}

/**
 * Checks if a date is in the past
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns True if date is in the past
 */
export function isPastDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Remove time component

  return date < today;
}

/**
 * Formats a date object to YYYY-MM-DD string
 *
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculates the difference in days between two dates
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between dates (absolute value)
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
