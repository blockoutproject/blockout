import type { MatchScheduleResponse } from "../../../../.generated/schemas/index.zod";

/** French schedule text derived only from an accepted sporting date or established instant. */
export interface SportingTimePresentation {
  date: string;
  time: string;
}

/** Reads the current device zone afresh; never capture it globally or use the source's zone. */
export function currentSportingTimeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Extracts a Gregorian day with Intl's date-specific zone rules, including DST. */
function dayInZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * Returns the display/grouping day in the supplied zone. An accepted date alone stays unchanged;
 * F02 already omits the instant for unknown time, including unconfirmed FFVB 00:00.
 * Calendar callers use their captured loading zone; detail callers use the current phone zone.
 */
export function sportingDay(
  schedule: MatchScheduleResponse,
  timeZone: string,
): string {
  return schedule.instant
    ? dayInZone(new Date(schedule.instant), timeZone)
    : schedule.localDate;
}

/**
 * Labels a validated sporting/calendar date relative to today in its own context zone.
 * UTC is only a carrier for Gregorian date formatting and day arithmetic, never a kickoff instant.
 * Retained calendar headings must pass the captured grouping zone, not the current display zone.
 */
export function formatSportingDay(
  day: string,
  timeZone: string,
  now = new Date(),
): string {
  const date = new Date(`${day}T00:00:00Z`);
  const today = new Date(`${dayInZone(now, timeZone)}T00:00:00Z`);
  const difference = (date.getTime() - today.getTime()) / 86_400_000;
  const relative =
    difference === 0
      ? "Aujourd’hui"
      : difference === -1
        ? "Hier"
        : difference === 1
          ? "Demain"
          : undefined;
  const absolute = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  return relative ? `${relative} · ${absolute}` : absolute;
}

/**
 * Formats accepted schedules in the current display zone with the offset at kickoff.
 * Source zone/clock reconstruction, grouping mutation and network reads are deliberately absent.
 * Confirmed midnight is an ordinary instant; absent instant always means time to be confirmed.
 */
export function formatSportingSchedule(
  schedule: MatchScheduleResponse,
  displayTimeZone = currentSportingTimeZone(),
  now = new Date(),
): SportingTimePresentation {
  return {
    date: formatSportingDay(
      sportingDay(schedule, displayTimeZone),
      displayTimeZone,
      now,
    ),
    time: schedule.instant
      ? new Intl.DateTimeFormat("fr-FR", {
          timeZone: displayTimeZone,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date(schedule.instant))
      : "Horaire à confirmer",
  };
}
