import type {
  ClubDetailResponse,
  MatchDetailResponse,
} from "../../../../.generated/schemas/index.zod";

/** Deterministic public fixture identity; never a real account or provider reference. */
export const sportingId = "00000000-0000-4000-8000-000000000001";

/** Supplies a minimal public club; scenario-specific contacts and seasons stay explicit. */
export function clubDetail(name = "Club"): ClubDetailResponse {
  return { club: { id: sportingId, name }, contacts: {}, seasons: [] };
}

/** Supplies a date-only match with unknown result and no inferred numerical values. */
export function matchDetail(): MatchDetailResponse {
  return {
    match: {
      id: sportingId,
      pool: {
        pool: { id: sportingId, name: "Pool" },
        season: { id: sportingId, label: "2026/2027", startYear: 2026 },
        classification: {},
      },
      home: { id: sportingId, name: "Home" },
      away: { id: "00000000-0000-4000-8000-000000000002", name: "Away" },
      schedule: {
        localDate: "2026-10-25",
        timeZone: "Europe/Paris",
        observedAt: "2026-10-24T16:00:00+02:00",
      },
      category: "upcoming",
    },
    documents: [],
  };
}
