const dayMonthYear = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  // Planting and harvest dates are calendar days, stored as midnight UTC.
  // Read in UTC, so a browser west of UTC doesn't show the day before.
  timeZone: "UTC",
});

/** "18/10/2026": day/month/year, whatever the browser's language. */
export const formatDate = (iso: string): string => dayMonthYear.format(new Date(iso));
