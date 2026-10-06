import { HttpError } from "./http-error";

export function assertIsoDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, "Date must use YYYY-MM-DD format");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, "Date is not valid");
  }

  return value;
}

export function weekdayForDate(value: string): number {
  assertIsoDate(value);
  return new Date(`${value}T00:00:00.000Z`).getUTCDay();
}

export function dateRangeInclusive(start: string, end: string): string[] {
  assertIsoDate(start);
  assertIsoDate(end);

  const first = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  if (last < first) {
    throw new HttpError(400, "endDate must be on or after startDate");
  }

  const days = Math.floor((last.valueOf() - first.valueOf()) / 86_400_000) + 1;
  if (days > 90) {
    throw new HttpError(400, "Date range cannot exceed 90 days");
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(first.valueOf() + index * 86_400_000);
    return date.toISOString().slice(0, 10);
  });
}

export function getLocalDateTime(now: Date, timezone: string): { date: string; time: string; weekday: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    }).formatToParts(now);
  } catch {
    throw new HttpError(400, "Invalid time zone");
  }

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekdayName = get("weekday");

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    weekday: weekdayMap[weekdayName] ?? -1,
  };
}
