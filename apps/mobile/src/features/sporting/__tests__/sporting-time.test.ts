import type { MatchScheduleResponse } from "../../../../.generated/schemas/index.zod";
import { formatSportingSchedule, sportingDay } from "../model/sporting-time";

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
