import {
  StreamModerationFilterEnum,
  StreamPlatformEnum,
} from "../../../../.generated/schemas/index.zod";
import type { ModerationFilters } from "../api/moderation";

/** Reads one committed native route selection; page remains owned by Query rather than navigation. */
export function moderationRouteFilters(
  params: Record<string, string | string[] | undefined>,
): ModerationFilters {
  const platform = StreamPlatformEnum.safeParse(params.platform);
  const state = StreamModerationFilterEnum.safeParse(params.state);
  return {
    query: typeof params.query === "string" ? params.query : undefined,
    seasonId:
      typeof params.seasonId === "string" && params.seasonId
        ? params.seasonId
        : undefined,
    platform: platform.success ? platform.data : undefined,
    state: state.success ? state.data : undefined,
  };
}
