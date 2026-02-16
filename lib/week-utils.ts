import { startOfDay, addDays, format, isBefore, isAfter } from "date-fns";

export interface WeekRange {
  start: Date; // Saturday
  end: Date; // Friday
  label: string;
}

/** Get the Saturday–Friday week range containing the given date */
export function getWeekRange(date: Date): WeekRange {
  const d = startOfDay(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
  // Days since last Saturday: Saturday=0, Sunday=1, Mon=2, ...Fri=6
  const daysSinceSaturday = (dayOfWeek + 1) % 7;
  const start = addDays(d, -daysSinceSaturday);
  const end = addDays(start, 6);
  return { start, end, label: formatWeekLabel(start, end) };
}

/** Format a week range as "Feb 8 - Feb 14, 2026" */
export function formatWeekLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  }
  return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
}

/** Extract all distinct Saturday–Friday week ranges from a list of dates, sorted descending */
export function getAvailableWeeks(dates: Date[]): WeekRange[] {
  const seen = new Set<string>();
  const weeks: WeekRange[] = [];

  for (const date of dates) {
    const week = getWeekRange(date);
    const key = week.start.toISOString();
    if (!seen.has(key)) {
      seen.add(key);
      weeks.push(week);
    }
  }

  return weeks.sort((a, b) => b.start.getTime() - a.start.getTime());
}

/** Check if a date falls within a week range */
export function isDateInWeek(date: Date, week: WeekRange): boolean {
  const d = startOfDay(date);
  return !isBefore(d, week.start) && !isAfter(d, week.end);
}

/** Get the last complete week (whose Friday has already passed) from a sorted-descending list */
export function getLastCompleteWeek(weeks: WeekRange[]): WeekRange | null {
  const today = startOfDay(new Date());
  for (const week of weeks) {
    if (isBefore(week.end, today)) return week;
  }
  return weeks.length > 0 ? weeks[weeks.length - 1] : null;
}
