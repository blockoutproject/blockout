import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
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

/** Defaults are fictional generated HTTP responses; each test exposes its decisive failure or delay. */
export async function consultationResponse(
  url: string,
  detail: MatchDetailResponse,
): Promise<Response> {
  const season = detail.match.pool.season;
  const parsed = new URL(url);
  const path = parsed.pathname;
  if (path.endsWith("/application-access"))
    return Response.json(applicationAccessResponse());
  if (path === `/clubs/${sportingId}`)
    return Response.json({
      ...clubDetail("Club des Rives"),
      seasons: [season],
      contacts: { email: "club@example.invalid" },
    });
  if (path.endsWith("/teams") && path.startsWith("/clubs/"))
    return Response.json({
      seasonId: parsed.searchParams.get("seasonId"),
      items: [],
    });
  if (path === `/teams/${sportingId}`)
    return Response.json({
      team: {
        team: { id: sportingId, name: "Équipe des Rives" },
        season,
        classification: {},
        professional: true,
      },
      participations: [detail.match.pool],
    });
  if (path === `/pools/${sportingId}`)
    return Response.json({ pool: detail.match.pool });
  if (path.endsWith("/standings"))
    return Response.json({
      poolId: sportingId,
      availability: "not-published",
      lastAttemptFailed: false,
      columns: [],
      rows: [],
    });
  if (path.endsWith("/participants"))
    return Response.json({ poolId: sportingId, items: [] });
  if (path.startsWith("/matches/")) return Response.json(detail);
  if (path === "/matches")
    return Response.json({
      category: parsed.searchParams.get("category"),
      timeZone: parsed.searchParams.get("timeZone"),
      evaluatedAt: "2026-10-25T12:00:00Z",
      days: [],
    });
  throw new Error(`Unexpected controlled request ${path}`);
}
