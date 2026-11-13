import { queryOptions } from "@tanstack/react-query";
import {
  getClubLogo,
  getTeamLogo,
  getDivisionLogo,
  getGetClubLogoQueryKey,
  getGetTeamLogoQueryKey,
  getGetDivisionLogoQueryKey,
} from "../../../../.generated/mobile";
import { ApiError } from "@/shared/api/api-fetch";
import { isAccessDenied } from "@/shared/api/access-denied";
import { binaryImagePreview } from "@/shared/api/binary-image-preview";
import type { PresentationTarget } from "./presentation";
import type { SportingQueryAuthority } from "./sporting-administration-queries";

/** A current HTTP refusal or missing binary withdraws the remote preview without changing the editable resource. */
function isRefusedOrMissingPreview(error: unknown): boolean {
  return (
    isAccessDenied(error) ||
    (error instanceof ApiError && error.kind === "http" && error.status === 404)
  );
}

/**
 * Keeps an editor's selected binary preview with its original revision. Generated calls own HTTP;
 * the memory URI conversion consumes cancellation and rejects an obsolete session after FileReader.
 * A refused or missing remote preview is removed until a successful read; local draft files belong to the form.
 */
export function createPresentationLogoQueryOptions(
  authority: SportingQueryAuthority,
  target: PresentationTarget,
  selection: "effective" | "automatic",
  revision: string,
) {
  const params = { selection };
  let generatedKey;
  if (target.kind === "team") {
    generatedKey = getGetTeamLogoQueryKey(target.id, params);
  } else if (target.kind === "club") {
    generatedKey = getGetClubLogoQueryKey(target.id);
  } else if (target.kind === "division") {
    generatedKey = getGetDivisionLogoQueryKey(target.id);
  } else {
    generatedKey = ["presentation-logo-unavailable", target.kind];
  }
  return queryOptions<string | null>({
    queryKey: [...generatedKey, revision],
    enabled:
      authority.enabled &&
      target.kind !== "pool" &&
      target.kind !== "division-creation",
    gcTime: 0,
    queryFn: async ({ signal, client, queryKey }) => {
      const previousError = client.getQueryState(queryKey)?.error;
      try {
        const options = await authority.request(signal);
        let blob;
        if (target.kind === "team") {
          blob = await getTeamLogo(target.id, params, options);
        } else if (target.kind === "club") {
          blob = await getClubLogo(target.id, options);
        } else if (target.kind === "division") {
          blob = await getDivisionLogo(target.id, options);
        } else {
          blob = undefined;
        }
        if (!blob) {
          throw new ApiError("configuration");
        }
        const uri = await binaryImagePreview(blob, signal);
        if (signal.aborted) {
          throw new ApiError("cancelled");
        }
        return uri;
      } catch (error) {
        if (signal.aborted) {
          throw new ApiError("cancelled");
        }
        if (isRefusedOrMissingPreview(error)) {
          client.getQueryCache().find({ queryKey, exact: true })?.setState({
            data: null,
          });
        }
        throw isRefusedOrMissingPreview(previousError) ? previousError : error;
      }
    },
  });
}
