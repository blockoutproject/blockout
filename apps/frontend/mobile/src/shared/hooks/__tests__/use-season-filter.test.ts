import { act, renderHook } from "@testing-library/react-native";
import {
  filterBySeason,
  getAvailableSeasons,
  useSeasonFilter,
} from "@/src/shared/hooks/use-season-filter";

type SeasonTeam = {
  id: number;
  season: string | null;
};

describe("season filtering", () => {
  const teams: SeasonTeam[] = [
    { id: 1, season: "2025" },
    { id: 2, season: null },
    { id: 3, season: "2026" },
    { id: 4, season: "2025" },
  ];

  it("deduplicates and orders available seasons from newest to oldest", () => {
    expect(getAvailableSeasons(teams)).toEqual(["2026", "2025"]);
  });

  it("keeps all items without a selected season", () => {
    expect(filterBySeason(teams, null)).toEqual(teams);
  });

  it("keeps only items from the selected season", () => {
    expect(filterBySeason(teams, "2025").map(({ id }) => id)).toEqual([1, 4]);
  });

  it("falls back to the newest available season when query data changes", async () => {
    const { result, rerender } = await renderHook<
      ReturnType<typeof useSeasonFilter<SeasonTeam>>,
      { items: SeasonTeam[] }
    >(({ items }) => useSeasonFilter(items), {
      initialProps: { items: teams },
    });

    await act(() => result.current?.setSelectedSeason("2025"));
    expect(result.current?.selectedSeason).toBe("2025");

    await rerender({ items: [{ id: 5, season: "2027" }] });

    expect(result.current?.selectedSeason).toBe("2027");
    expect(result.current?.filteredItems).toEqual([{ id: 5, season: "2027" }]);
  });
});
