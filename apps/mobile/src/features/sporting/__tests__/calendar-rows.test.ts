import type { MatchDayResponse } from "../../../../.generated/schemas/index.zod";
import { calendarRows } from "../model/calendar-rows";
import { matchDetail, sportingId } from "../test-support/consultation-data";

it("keeps every encounter individually addressable between sticky day headings and pool headings", () => {
  // Given
  const first = matchDetail().match;
  const second = { ...first, id: "00000000-0000-4000-8000-000000000002" };
  const otherPoolId = "00000000-0000-4000-8000-000000000005";
  const third = {
    ...first,
    id: "00000000-0000-4000-8000-000000000003",
    pool: { ...first.pool, pool: { ...first.pool.pool, id: otherPoolId } },
  };
  const fourth = { ...first, id: "00000000-0000-4000-8000-000000000004" };
  const days: MatchDayResponse[] = [
    {
      date: "2026-10-26",
      pools: [
        { poolId: sportingId, matches: [first, second] },
        { poolId: otherPoolId, matches: [third] },
      ],
    },
    { date: "2026-10-27", pools: [{ poolId: sportingId, matches: [fourth] }] },
  ];

  // When
  const rows = calendarRows(days, false);

  // Then
  expect(
    rows.filter((row) => row.kind !== "space").map((row) => row.kind),
  ).toEqual([
    "date",
    "pool",
    "match",
    "match",
    "pool",
    "match",
    "date",
    "pool",
    "match",
  ]);
  expect(
    rows.filter((row) => row.kind === "match").map((row) => row.match.id),
  ).toEqual([first.id, second.id, third.id, fourth.id]);
  expect(
    rows
      .filter((row) => row.kind === "match")
      .map((row) => [row.first, row.last]),
  ).toEqual([
    [true, false],
    [false, true],
    [true, true],
    [true, true],
  ]);
  expect(
    rows.filter((row) => row.kind === "date").map((row) => row.date),
  ).toEqual(["2026-10-26", "2026-10-27"]);
  expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
});

it("removes the lateral grid spacers when enlarged text stacks the real day headings", () => {
  // Given
  const days: MatchDayResponse[] = [
    {
      date: "2026-10-26",
      pools: [{ poolId: sportingId, matches: [matchDetail().match] }],
    },
  ];

  // When
  const rows = calendarRows(days, true);

  // Then
  expect(rows.map((row) => row.kind)).toEqual(["date", "pool", "match"]);
});
