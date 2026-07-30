import {
  filterAndSortModerationMatches,
  getLiveLinkModerationActions,
  getLiveLinkStatusPresentation,
  getLiveProviderIcon,
  sortLiveLinkHistory,
} from "@/src/modules/match/view-models/live-link-moderation";
import { darkTheme } from "@/src/shared/theme";

describe("live-link moderation presentation", () => {
  it.each([
    ["PENDING", "En attente", "clock-outline"],
    ["ACTIVE", "Actif", "check-circle-outline"],
    ["REJECTED", "Rejeté", "close-circle-outline"],
    ["DEACTIVATED", "Désactivé", "eye-off-outline"],
    ["BANNED", "Banni", "block-helper"],
    ["EXPIRED", "Expiré", "timer-off-outline"],
  ] as const)("owns the %s status presentation", (status, label, icon) => {
    expect(getLiveLinkStatusPresentation(status, darkTheme)).toMatchObject({
      label,
      icon,
    });
  });

  it("filters team labels and sorts matches newest first without mutating input", () => {
    const matches = [
      {
        id: 1,
        matchDate: "2026-01-01T18:00:00Z",
        teamA: { name: "Blockout Paris", shortName: "Paris" },
        teamB: { name: "Lyon Volley", shortName: "Lyon" },
      },
      {
        id: 2,
        matchDate: "2026-02-01T18:00:00Z",
        teamA: { name: "Nantes Volley", shortName: "Nantes" },
        teamB: { name: "Blockout Rennes", shortName: "Rennes" },
      },
    ];

    expect(filterAndSortModerationMatches(matches, "paris")).toEqual([
      matches[0],
    ]);
    expect(filterAndSortModerationMatches(matches, "")).toEqual([
      matches[1],
      matches[0],
    ]);
    expect(matches.map(({ id }) => id)).toEqual([1, 2]);
  });

  it("preserves source order when either compared match has no date", () => {
    const matches = [
      {
        id: 1,
        matchDate: null,
        teamA: { name: "Paris" },
        teamB: { name: "Lyon" },
      },
      {
        id: 2,
        matchDate: "2026-02-01T18:00:00Z",
        teamA: { name: "Nantes" },
        teamB: { name: "Rennes" },
      },
    ];

    expect(filterAndSortModerationMatches(matches, "")).toEqual(matches);
  });

  it("sorts history, resolves providers, and exposes only valid status actions", () => {
    const links = [
      { id: 1, createdAt: "2026-01-01T18:00:00Z" },
      { id: 2, createdAt: "2026-02-01T18:00:00Z" },
    ];

    expect(sortLiveLinkHistory(links)).toEqual([links[1], links[0]]);
    expect(getLiveProviderIcon("YOUTUBE")).toBe("youtube");
    expect(getLiveProviderIcon(null)).toBe("video-outline");
    expect(getLiveLinkModerationActions("PENDING")).toEqual({
      approve: true,
      reject: true,
      deleteActive: false,
      reactivate: false,
    });
    expect(getLiveLinkModerationActions("ACTIVE")).toEqual({
      approve: false,
      reject: false,
      deleteActive: true,
      reactivate: false,
    });
    expect(getLiveLinkModerationActions("BANNED")).toEqual({
      approve: false,
      reject: false,
      deleteActive: false,
      reactivate: true,
    });
  });
});
