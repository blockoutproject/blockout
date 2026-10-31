import type { QueryClient } from "@tanstack/react-query";
import type { MatchDetailResponse } from "../../../.generated/schemas/index.zod";
import { resourceUnavailable } from "./model/consultation-availability";

/**
 * Observes actual F03 refusals and successful current link absence in the caller's native cache.
 * The subscription retains no restriction state; technical failures alone change neither outcome.
 * @returns cleanup for the captured QueryClient's lifetime
 */
export function subscribeMatchAccess(
  client: QueryClient,
  onAccess: (
    matchId: string,
    outcome: "unavailable" | "link-unavailable",
  ) => void,
) {
  return client.getQueryCache().subscribe((event) => {
    const matchId = event.query.meta?.sportingMatchId;
    if (event.type !== "updated" || typeof matchId !== "string") return;
    if (
      (event.action.type === "error" || event.action.type === "failed") &&
      resourceUnavailable(event.action.error)
    )
      onAccess(matchId, "unavailable");
    else if (event.action.type === "success") {
      // F03's query admits this generated response only after transport validation.
      const detail = client.getQueryData<MatchDetailResponse>(
        event.query.queryKey,
      );
      if (detail && !detail.streamUrl) onAccess(matchId, "link-unavailable");
    }
  });
}
