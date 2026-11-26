import type { MatchDayResponse } from "../../../../.generated/schemas/index.zod";
import { calendarRows } from "../model/calendar-rows";
import { matchDetail, sportingId } from "../test-support/consultation-data";

it("keeps encounters addressable and joins each date-local pool card under its sticky date", () => {
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
  const stackedRows = calendarRows(days, true);

  // Then
  expect(rows.map((row) => row.kind)).toEqual([
    "date",
    "match",
    "space",
    "match",
    "space",
    "match",
    "date",
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
  const cardKeys = rows
    .filter((row) => row.kind === "match")
    .map((row) => row.groupKey);
  expect(cardKeys[0]).toBe(cardKeys[1]);
  expect(new Set(cardKeys).size).toBe(3);
  expect(
    rows.filter((row) => row.kind === "date").map((row) => row.groupKey),
  ).toEqual([cardKeys[0], cardKeys[3]]);
  expect(
    rows.filter((row) => row.kind === "date").map((row) => row.date),
  ).toEqual(["2026-10-26", "2026-10-27"]);
  expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  expect(stackedRows).toEqual(rows.filter((row) => row.kind !== "space"));
});
