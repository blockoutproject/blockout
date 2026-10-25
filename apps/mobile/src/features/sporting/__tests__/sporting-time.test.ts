import type { MatchScheduleResponse } from "../../../../.generated/schemas/index.zod";
import {
  formatSportingDay,
  formatSportingSchedule,
  sportingDay,
} from "../model/sporting-time";

const a07: MatchScheduleResponse = {
  localDate: "2026-09-20",
  instant: "2026-09-20T00:30:00+02:00",
  timeZone: "Europe/Paris",
  observedAt: "2026-09-19T12:00:00Z",
};

it.each([
  ["Europe/Paris", "2026-09-20", "20 sept. 2026", "00:30"],
  ["America/New_York", "2026-09-19", "19 sept. 2026", "18:30"],
])("presents the exact A07 instant in %s", (zone, day, date, time) => {
  // Given
  const now = new Date("2026-09-10T12:00:00Z");

  // When
  const presentation = formatSportingSchedule(a07, zone, now);

  // Then
  expect(sportingDay(a07, zone)).toBe(day);
  expect(presentation).toEqual({ date, time });
  expect(a07.instant).toBe("2026-09-20T00:30:00+02:00");
});

it.each([
  ["2026-03-08T06:30:00Z", "America/New_York", "01:30"],
  ["2026-03-08T07:30:00Z", "America/New_York", "03:30"],
  ["2026-03-15T19:00:00Z", "Europe/Paris", "20:00"],
  ["2026-03-15T19:00:00Z", "America/New_York", "15:00"],
  ["2026-03-29T00:30:00Z", "Europe/Paris", "01:30"],
  ["2026-03-29T01:30:00Z", "Europe/Paris", "03:30"],
  ["2026-10-25T00:30:00Z", "Europe/Paris", "02:30"],
  ["2026-10-25T01:30:00Z", "Europe/Paris", "02:30"],
  ["2026-11-01T05:30:00Z", "America/New_York", "01:30"],
  ["2026-11-01T06:30:00Z", "America/New_York", "01:30"],
])("uses the date-specific offset for %s in %s", (instant, zone, time) => {
  // Given: the display clock is in another season; offsets belong to kickoff.
  const now = new Date("2026-01-10T12:00:00Z");

  // When
  const presentation = formatSportingSchedule({ ...a07, instant }, zone, now);

  // Then
  expect(presentation.time).toBe(time);
});

it.each(["Europe/Paris", "America/New_York", "Pacific/Kiritimati"])(
  "keeps the sporting date and unknown FFVB midnight precision in %s",
  (zone) => {
    // Given: F02 omits the instant for an unconfirmed FFVB 00:00 or unknown time.
    const schedule: MatchScheduleResponse = {
      localDate: "2026-09-20",
      observedAt: a07.observedAt,
    };

    // When
    const presentation = formatSportingSchedule(
      schedule,
      zone,
      new Date("2026-09-10T12:00:00Z"),
    );

    // Then
    expect(sportingDay(schedule, zone)).toBe("2026-09-20");
    expect(presentation).toEqual({
      date: "20 sept. 2026",
      time: "Horaire à confirmer",
    });
    expect(schedule.instant).toBeUndefined();
  },
);

it("converts genuine confirmed midnight rather than treating it as unknown", () => {
  // Given
  const schedule = { ...a07, instant: "2026-09-20T00:00:00+02:00" };
  const now = new Date("2026-09-10T12:00:00Z");

  // When
  const paris = formatSportingSchedule(schedule, "Europe/Paris", now);
  const newYork = formatSportingSchedule(schedule, "America/New_York", now);

  // Then
  expect(paris).toEqual({ date: "20 sept. 2026", time: "00:00" });
  expect(newYork).toEqual({ date: "19 sept. 2026", time: "18:00" });
});

it.each([
  ["2026-09-20", "Europe/Paris", "Aujourd’hui · 20 sept. 2026"],
  ["2026-09-20", "America/New_York", "Demain · 20 sept. 2026"],
  ["2026-09-19", "Europe/Paris", "Hier · 19 sept. 2026"],
  ["2026-09-19", "America/New_York", "Aujourd’hui · 19 sept. 2026"],
  ["2026-09-22", "Europe/Paris", "22 sept. 2026"],
])("labels day %s relative to the clock in %s", (day, zone, label) => {
  // Given
  const now = new Date("2026-09-19T22:45:00Z");

  // When
  const presentation = formatSportingDay(day, zone, now);

  // Then
  expect(presentation).toBe(label);
});

it("compares calendar days across a 23-hour DST day and a year boundary", () => {
  // Given
  const afterDst = new Date("2026-03-29T22:30:00Z");
  const newYear = new Date("2026-12-31T23:30:00Z");

  // When / Then
  expect(formatSportingDay("2026-03-29", "Europe/Paris", afterDst)).toBe(
    "Hier · 29 mars 2026",
  );
  expect(formatSportingDay("2026-12-31", "Europe/Paris", newYear)).toBe(
    "Hier · 31 déc. 2026",
  );
});
