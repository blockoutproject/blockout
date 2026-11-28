import { queryOptions, useQueries } from "@tanstack/react-query";
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
import { useSportingAuthority } from "./classification";
import {
  createSportingReader,
  type SportingQueryAuthority,
} from "./sporting-administration-queries";

type LogoKind = Exclude<PresentationTarget["kind"], "pool">;
type LogoSelection = "effective" | "automatic";

/** Without a team selection, matches the active artwork query for either rendition. */
export function presentationLogoKey(
  kind: LogoKind,
  id: string,
  selection?: LogoSelection,
) {
  switch (kind) {
    case "team":
      return getGetTeamLogoQueryKey(id, selection ? { selection } : undefined);
    case "club":
      return getGetClubLogoQueryKey(id);
    case "division":
      return getGetDivisionLogoQueryKey(id);
  }
}

/**
 * Keeps an editor's selected binary preview in its generated cache owner. Generated calls own HTTP;
 * the memory URI conversion consumes cancellation and rejects an obsolete session after FileReader.
 * A refused or missing remote preview is removed until a successful read; local draft files belong to the form.
 */
function createPresentationLogoQueryOptions(
  authority: SportingQueryAuthority,
  kind: LogoKind,
  id: string,
  selection: LogoSelection,
) {
  const read = createSportingReader(authority);
  return queryOptions<string | null>({
    queryKey: presentationLogoKey(kind, id, selection),
    enabled: authority.enabled,
    gcTime: 0,
    queryFn: (context) =>
      read(context, async (options) => {
        let blob;
        if (kind === "team") {
          blob = await getTeamLogo(id, { selection }, options);
        } else if (kind === "club") {
          blob = await getClubLogo(id, options);
        } else {
          blob = await getDivisionLogo(id, options);
        }
        const uri = await binaryImagePreview(blob, context.signal);
        if (context.signal.aborted) {
          throw new ApiError("cancelled");
        }
        return uri;
      }),
  });
}

/** Keeps artwork on the addressed resource while the form switches between its remote and local previews. */
export function usePresentationLogo(
  target: PresentationTarget | undefined,
  selection: LogoSelection,
  enabled = true,
) {
  const authority = useSportingAuthority(
    target?.kind === "division" ? "divisions" : "presentation",
  );
  const queries: ReturnType<typeof createPresentationLogoQueryOptions>[] =
    target && target.kind !== "pool"
      ? [
          createPresentationLogoQueryOptions(
            { ...authority, enabled: enabled && authority.enabled },
            target.kind,
            target.id,
            selection,
          ),
        ]
      : [];
  return useQueries({ queries }).at(0);
}
