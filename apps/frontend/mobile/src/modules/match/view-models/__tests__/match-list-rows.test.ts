import {
  buildMatchListRows,
  getMatchListRowKey,
} from "@/src/modules/match/view-models/match-list-rows";

describe("match list rows", () => {
  it("creates one stable date boundary for an empty match day", () => {
    const rows = buildMatchListRows([
      {
        date: "2026-04-25",
        pools: [],
      },
    ]);

    expect(rows).toEqual([
      {
        type: "sectionHeader",
        title: expect.any(String),
        sectionKey: "2026-04-25",
      },
    ]);
    expect(getMatchListRowKey(rows[0])).toBe("h-2026-04-25");
  });
});
