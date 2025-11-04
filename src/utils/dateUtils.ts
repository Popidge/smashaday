export function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatUTCDateForDisplay(utcDateString: string, locale = 'en-GB'): string {
  // utcDateString is "YYYY-MM-DD" in UTC
  // Parse without timezone conversion, display in user's locale
  const [year, month, day] = utcDateString.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString(locale);
}