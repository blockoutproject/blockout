import { SportingEntityCard } from "../../sporting/entity-card";
import type { SearchResult } from "../model/search-result";

/** Search loading retains the same badge geometry as the F03 identity card. */
export { entityBadgeSize as resultBadgeSize } from "../../sporting/entity-card";

/** Presents F04's current summary slots through the shared F03 card; search owns activation separately. */
export function SearchResultCard(props: SearchResult) {
  return <SportingEntityCard {...props} />;
}
