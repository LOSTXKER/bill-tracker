export const THAILAND_OFFSET_HOURS = 7;
export const THAILAND_OFFSET_MS = THAILAND_OFFSET_HOURS * 3600_000;

/**
 * Convert a date string like "2026-02-01" to the start of that day in
 * Thailand time (UTC+7), expressed as a UTC Date.
 *
 * Example: "2026-02-01" → 2026-01-31T17:00:00.000Z (Feb 1 00:00 in UTC+7)
 */
export function toThaiStartOfDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - THAILAND_OFFSET_MS);
}

/**
 * Convert a date string like "2026-02-28" to the end of that day in
 * Thailand time (UTC+7), expressed as a UTC Date.
 *
 * Example: "2026-02-28" → 2026-02-28T16:59:59.999Z (Feb 28 23:59:59.999 in UTC+7)
 */
export function toThaiEndOfDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - THAILAND_OFFSET_MS);
}

/**
 * Return the full month range in Thailand time as UTC Dates.
 *
 * @param year  – full year, e.g. 2026
 * @param month – 1-based month (1 = January, 12 = December)
 */
export function getThaiMonthRange(year: number, month: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const startDate = new Date(Date.UTC(year, month - 1, 1) - THAILAND_OFFSET_MS);
  const endDate = new Date(
    Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999) - THAILAND_OFFSET_MS,
  );

  return { startDate, endDate };
}

/**
 * Shift a UTC Date forward by the Thailand offset so that
 * getFullYear/getMonth/getDate reflect the Thai calendar day.
 * Useful for bucketing DB timestamps into Thai-local months.
 */
export function toThaiLocalDate(utcDate: Date): Date {
  return new Date(utcDate.getTime() + THAILAND_OFFSET_MS);
}
