import {
  ListTeamsParams,
  type SportingSearchOptionsResponse,
} from "../../../../.generated/schemas/index.zod";
import { z } from "zod";

/** Editable optional sporting criteria; generated enum/UUID rules retain the wire vocabulary. */
export const searchFiltersSchema = ListTeamsParams.pick({
  seasonId: true,
  divisionId: true,
  format: true,
  gender: true,
});
/** Applied criteria and the independent RHF draft share the same single-valued meaning. */
export type SearchFilters = z.infer<typeof searchFiltersSchema>;

/** Reconciles only established catalogue changes; a failed read supplies no catalogue. */
export function reconcileSearchFilters(
  selection: SearchFilters | undefined,
  options: SportingSearchOptionsResponse,
): SearchFilters {
  return {
    ...selection,
    seasonId:
      selection === undefined ||
      (selection.seasonId !== undefined &&
        !options.seasons.some((season) => season.id === selection.seasonId))
        ? options.seasons[0]?.id
        : selection.seasonId,
    divisionId: options.divisions.some(
      (division) => division.id === selection?.divisionId,
    )
      ? selection?.divisionId
      : undefined,
  };
}
