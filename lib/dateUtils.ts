/**
 * Add business days to a date (skipping weekends)
 * @param date Starting date
 * @param businessDays Number of business days to add
 * @returns New date with business days added
 */
export function addBusinessDays(date: Date, businessDays: number): Date {
  const result = new Date(date);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);

    // Skip weekends (0 = Sunday, 6 = Saturday)
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return result;
}

/**
 * Get default due date (5 business days from now)
 * @param fromDate Optional starting date (defaults to now)
 * @returns Date that is 5 business days from the starting date
 */
export function getDefaultDueDate(fromDate?: Date): Date {
  const startDate = fromDate || new Date();
  return addBusinessDays(startDate, 5);
}
