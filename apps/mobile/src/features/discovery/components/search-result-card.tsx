import { SportingEntityCard } from "../../sporting/entity-card";
import type { SearchResult } from "../model/search-result";

/** Search loading retains the same badge geometry as the F03 identity card. */
export { entityBadgeSize as resultBadgeSize } from "../../sporting/entity-card";

/** Current summary with one voluntary opening action supplied by the active search scene. */
export interface SearchResultCardProps extends SearchResult {
  onPress(): void;
}

/** Uses F03's accessible whole-card link and disclosure without owning navigation or advertising. */
export function SearchResultCard(props: SearchResultCardProps) {
  return <SportingEntityCard {...props} />;
}
