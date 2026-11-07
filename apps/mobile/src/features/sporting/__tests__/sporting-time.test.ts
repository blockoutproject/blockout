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
  ["Europe/Paris", "2026-09-20", "20 septembre 2026", "00h30"],
  ["America/New_York", "2026-09-19", "19 septembre 2026", "18h30"],
])("presents the exact A07 instant in %s", (zone, day, date, time) => {
  // Given: the accepted A07 instant and the table's display zone.

  // When
  const presentation = formatSportingSchedule(a07, zone);

  // Then
  expect(sportingDay(a07, zone)).toBe(day);
  expect(presentation).toEqual({ date, time });
  expect(a07.instant).toBe("2026-09-20T00:30:00+02:00");
});

it.each([
  ["2026-03-08T06:30:00Z", "America/New_York", "01h30"],
  ["2026-03-08T07:30:00Z", "America/New_York", "03h30"],
  ["2026-03-15T19:00:00Z", "Europe/Paris", "20h00"],
  ["2026-03-15T19:00:00Z", "America/New_York", "15h00"],
  ["2026-03-29T00:30:00Z", "Europe/Paris", "01h30"],
  ["2026-03-29T01:30:00Z", "Europe/Paris", "03h30"],
  ["2026-10-25T00:30:00Z", "Europe/Paris", "02h30"],
  ["2026-10-25T01:30:00Z", "Europe/Paris", "02h30"],
  ["2026-11-01T05:30:00Z", "America/New_York", "01h30"],
  ["2026-11-01T06:30:00Z", "America/New_York", "01h30"],
])("uses the date-specific offset for %s in %s", (instant, zone, time) => {
  // Given: the table crosses both display zones' daylight-saving boundaries.

  // When
  const presentation = formatSportingSchedule({ ...a07, instant }, zone);

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
    const presentation = formatSportingSchedule(schedule, zone);

    // Then
    expect(sportingDay(schedule, zone)).toBe("2026-09-20");
    expect(presentation).toEqual({
      date: "20 septembre 2026",
      time: "Heure à définir",
    });
    expect(schedule.instant).toBeUndefined();
  },
);

it("converts genuine confirmed midnight rather than treating it as unknown", () => {
  // Given
  const schedule = { ...a07, instant: "2026-09-20T00:00:00+02:00" };

  // When
  const paris = formatSportingSchedule(schedule, "Europe/Paris");
  const newYork = formatSportingSchedule(schedule, "America/New_York");

  // Then
  expect(paris).toEqual({ date: "20 septembre 2026", time: "00h00" });
  expect(newYork).toEqual({ date: "19 septembre 2026", time: "18h00" });
});

it.each([
  "2026-11-06T12:00:00Z",
  "2026-11-07T12:00:00Z",
  "2026-11-08T12:00:00Z",
])("keeps the match date absolute when the phone clock is %s", (now) => {
  // Given: tomorrow, today and yesterday must not add another date label.
  jest.useFakeTimers().setSystemTime(new Date(now));
  const schedule = {
    localDate: "2026-11-07",
    instant: "2026-11-07T19:40:00Z",
    observedAt: a07.observedAt,
  };

  try {
    // When
    const presentation = formatSportingSchedule(schedule, "Europe/Paris");

    // Then
    expect(presentation).toEqual({
      date: "7 novembre 2026",
      time: "20h40",
    });
  } finally {
    jest.useRealTimers();
  }
});

it.each([
  ["2026-03-29", "29 mars 2026"],
  ["2026-12-31", "31 décembre 2026"],
])(
  "formats the accepted calendar day %s without a relative prefix",
  (day, label) => {
    // Given: the accepted civil day remains independent of a phone-zone conversion.

    // When
    const presentation = formatSportingDay(day);

    // Then
    expect(presentation).toBe(label);
  },
);
