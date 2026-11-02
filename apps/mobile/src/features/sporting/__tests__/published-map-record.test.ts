import type { PoolStandingsResponse } from "../../../../.generated/schemas/index.zod";
import { publishedMapRecord } from "../model/published-map-record";
import { sportingId } from "../test-support/consultation-data";

/** Keeps literal provider columns and raw values visible in each projection scenario. */
function table(
  columns: string[],
  statistics: Record<string, string>,
): PoolStandingsResponse {
  return {
    poolId: "00000000-0000-4000-8000-000000002101",
    availability: "available",
    observedAt: "2026-11-01T12:00:00Z",
    lastAttemptFailed: false,
    columns,
    rows: [
      {
        sourceName: "Published team",
        team: { id: sportingId, name: "Resolved team" },
        statistics,
      },
    ],
  };
}

it.each([
  ["FFVB", ["Jou.", "Gag.", "Per."]],
  ["LNV", ["Matchs / Joués", "Matchs / Gagnés", "Matchs / Perdus"]],
] as const)(
  "projects a complete coherent %s match record",
  (_source, columns) => {
    // Given
    const [played, won, lost] = columns;
    const published = table([...columns], {
      [played]: "8",
      [won]: "7",
      [lost]: "1",
    });

    // When
    const record = publishedMapRecord(published, sportingId);

    // Then
    expect(record).toEqual({
      played: "8",
      won: "7",
      lost: "1",
      proportion: { won: 7, lost: 1 },
    });
  },
);

it("retains an available exact record when the latest collection attempt failed", () => {
  // Given: a failed acquisition does not invalidate the retained published sporting facts.
  const published = table(["Jou.", "Gag.", "Per."], {
    "Jou.": "8",
    "Gag.": "7",
    "Per.": "1",
  });
  published.lastAttemptFailed = true;

  // When
  const record = publishedMapRecord(published, sportingId);

  // Then
  expect(record).toEqual({
    played: "8",
    won: "7",
    lost: "1",
    proportion: { won: 7, lost: 1 },
  });
});

it("keeps raw partial and special values without deriving the unpublished loss count", () => {
  // Given: Per. is absent from the published columns even though a statistics key exists.
  const published = table(["Jou.", "Gag."], {
    "Jou.": " 8 ",
    "Gag.": "F",
    "Per.": "1",
  });

  // When
  const record = publishedMapRecord(published, sportingId);

  // Then
  expect(record).toEqual({
    played: " 8 ",
    won: "F",
    lost: undefined,
    proportion: undefined,
  });
});

it("treats a blank published count as unknown without replacing it with zero", () => {
  // Given
  const published = table(["Jou.", "Gag.", "Per."], {
    "Jou.": "0",
    "Gag.": "0",
    "Per.": " \t ",
  });

  // When
  const record = publishedMapRecord(published, sportingId);

  // Then
  expect(record).toEqual({
    played: "0",
    won: "0",
    lost: undefined,
    proportion: undefined,
  });
});

it.each([
  ["no played match", "0", "0", "0"],
  ["inconsistent totals", "8", "7", "2"],
  ["unsafe integer", "9007199254740993", "9007199254740992", "1"],
  ["negative count", "8", "-1", "9"],
  ["fractional count", "8", "7.5", "0.5"],
  ["special published value", "8", "F", "1"],
])(
  "keeps %s visible without inventing a numerical proportion",
  (_reason, played, won, lost) => {
    // Given
    const published = table(["Jou.", "Gag.", "Per."], {
      "Jou.": played,
      "Gag.": won,
      "Per.": lost,
    });

    // When
    const record = publishedMapRecord(published, sportingId);

    // Then
    expect(record).toEqual({ played, won, lost, proportion: undefined });
  },
);

it("does not confuse LNV set or point totals with the match record", () => {
  // Given
  const published = table(
    ["Sets / Gagnés", "Sets / Perdus", "Points / Gagnés", "Points / Perdus"],
    {
      "Sets / Gagnés": "21",
      "Sets / Perdus": "3",
      "Points / Gagnés": "600",
      "Points / Perdus": "300",
    },
  );

  // When
  const record = publishedMapRecord(published, sportingId);

  // Then
  expect(record).toBeUndefined();
});

it("omits an ambiguous mixture of the two match-column families", () => {
  // Given
  const published = table(["Jou.", "Gag.", "Per.", "Matchs / Joués"], {
    "Jou.": "8",
    "Gag.": "7",
    "Per.": "1",
    "Matchs / Joués": "9",
  });

  // When
  const record = publishedMapRecord(published, sportingId);

  // Then
  expect(record).toBeUndefined();
});

it("omits two official rows associated with the same exact team instead of choosing one", () => {
  // Given
  const published = table(["Jou.", "Gag.", "Per."], {
    "Jou.": "8",
    "Gag.": "7",
    "Per.": "1",
  });
  published.rows.push({
    sourceName: "Another published row",
    team: { id: sportingId, name: "Resolved team" },
    statistics: { "Jou.": "9", "Gag.": "8", "Per.": "1" },
  });

  // When
  const record = publishedMapRecord(published, sportingId);

  // Then
  expect(record).toBeUndefined();
});
