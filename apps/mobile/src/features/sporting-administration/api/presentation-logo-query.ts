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
import { binaryImagePreview } from "@/shared/api/binary-image-preview";
import type { PresentationTarget } from "./presentation";
import {
  createSportingReader,
  type SportingQueryAuthority,
} from "./sporting-administration-queries";

/**
 * Keeps an editor's selected binary preview in its generated cache owner. Generated calls own HTTP;
 * the memory URI conversion consumes cancellation and rejects an obsolete session after FileReader.
 * A refused or missing remote preview is removed until a successful read; local draft files belong to the form.
 */
export function createPresentationLogoQueryOptions(
  authority: SportingQueryAuthority,
  target: PresentationTarget,
  selection: "effective" | "automatic",
) {
  const params = { selection };
  const read = createSportingReader(authority);
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
    queryKey: generatedKey,
    enabled:
      authority.enabled &&
      target.kind !== "pool" &&
      target.kind !== "division-creation",
    gcTime: 0,
    queryFn: (context) =>
      read(context, async (options) => {
        let blob;
        if (target.kind === "team") {
          blob = await getTeamLogo(target.id, params, options);
        } else if (target.kind === "club") {
          blob = await getClubLogo(target.id, options);
        } else if (target.kind === "division") {
          blob = await getDivisionLogo(target.id, options);
        }
        if (!blob) {
          throw new ApiError("configuration");
        }
        const uri = await binaryImagePreview(blob, context.signal);
        if (context.signal.aborted) {
          throw new ApiError("cancelled");
        }
        return uri;
      }),
  });
}
