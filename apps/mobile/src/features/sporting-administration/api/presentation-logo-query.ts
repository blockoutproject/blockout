import { queryOptions } from "@tanstack/react-query";
import {
  getClubLogo,
  getTeamLogo,
  getDivisionLogo,
  getGetClubLogoQueryKey,
  getGetTeamLogoQueryKey,
  getGetDivisionLogoQueryKey,
} from "../../../../.generated/mobile";
import { ApiError } from "../../../shared/api/api-fetch";
import { binaryImagePreview } from "../../../shared/api/binary-image-preview";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import type { PresentationTarget } from "./presentation";
import type { SportingQueryAuthority } from "./sporting-administration-queries";

/**
 * Keeps an editor's selected binary preview with its original revision. Generated calls own HTTP;
 * the memory URI conversion consumes cancellation and rejects an obsolete session after FileReader.
 */
export function createPresentationLogoQueryOptions(
  authority: SportingQueryAuthority,
  target: PresentationTarget,
  selection: "effective" | "automatic",
  revision: string,
) {
  const params = { selection };
  const generatedKey =
    target.kind === "team"
      ? getGetTeamLogoQueryKey(target.id, params)
      : target.kind === "club"
        ? getGetClubLogoQueryKey(target.id)
        : target.kind === "division"
          ? getGetDivisionLogoQueryKey(target.id)
          : ["presentation-logo-unavailable", target.kind];
  return queryOptions({
    queryKey: getSessionQueryKey(authority.session.generation, [
      ...generatedKey,
      revision,
    ]),
    enabled:
      authority.enabled &&
      target.kind !== "pool" &&
      target.kind !== "division-creation",
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const options = await authority.request(signal);
      const blob =
        target.kind === "team"
          ? await getTeamLogo(target.id, params, options)
          : target.kind === "club"
            ? await getClubLogo(target.id, options)
            : target.kind === "division"
              ? await getDivisionLogo(target.id, options)
              : undefined;
      if (!blob) throw new ApiError("configuration");
      const uri = await binaryImagePreview(blob, signal);
      if (
        !authority.session.isCurrent(authority.session.generation) ||
        signal.aborted
      )
        throw new ApiError("cancelled");
      return uri;
    },
  });
}
