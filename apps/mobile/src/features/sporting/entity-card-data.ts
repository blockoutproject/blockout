import type {
  PoolSummaryResponse,
  SportingClassificationResponse,
  SportingIdentityResponse,
  SportingSeasonResponse,
  TeamSummaryResponse,
} from "../../../.generated/schemas/index.zod";

/** Current public sporting fields shared by loaded entity cards. Omitted facts remain absent. */
export interface SportingEntityCardData {
  kind: "club" | "team" | "pool";
  identity: SportingIdentityResponse;
  city?: string;
  subtitle?: string;
  club?: SportingIdentityResponse;
  classification?: SportingClassificationResponse;
  season?: SportingSeasonResponse;
}

export function sportingEntityCardData(
  summary: TeamSummaryResponse | PoolSummaryResponse,
): SportingEntityCardData {
  if ("team" in summary) {
    const { team, club, season, classification } = summary;
    return { kind: "team", identity: team, club, season, classification };
  }
  const { pool, season, classification, competitionName, phaseName } = summary;
  return {
    kind: "pool",
    identity: pool,
    subtitle:
      [competitionName, phaseName].filter(Boolean).join(" - ") || undefined,
    season,
    classification,
  };
}

/** UUID casing is immaterial to list position or deduplication. */
export function sportingEntityCardKey(item: SportingEntityCardData) {
  return item.identity.id.toLowerCase();
}
