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

/** Formats an established instant with its date-specific offset, without reconstructing a source clock. */
export function formatSportingTime(
  instant: string,
  displayTimeZone = currentSportingTimeZone(),
): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: displayTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(instant))
    .replace(":", "h");
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
 * Formats a validated sporting/calendar day without duplicating it with a relative label.
 * Callers retain their accepted display/grouping day; UTC only carries the civil date, never a kickoff instant.
 */
export function formatSportingDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Formats accepted schedules in the current display zone with the offset at kickoff.
 * Source zone/clock reconstruction, grouping mutation and network reads are deliberately absent.
 * Confirmed midnight is an ordinary instant; absent instant always means time to be confirmed.
 */
export function formatSportingSchedule(
  schedule: MatchScheduleResponse,
  displayTimeZone = currentSportingTimeZone(),
): SportingTimePresentation {
  return {
    date: formatSportingDay(sportingDay(schedule, displayTimeZone)),
    time: schedule.instant
      ? formatSportingTime(schedule.instant, displayTimeZone)
      : "Heure à définir",
  };
}
