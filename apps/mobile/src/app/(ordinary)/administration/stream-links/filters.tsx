import { useLocalSearchParams } from "expo-router";
import { ModerationFilters } from "../../../../features/contributions/components/moderation-filters";
import { moderationRouteFilters } from "../../../../features/contributions/model/moderation-route-filters";

/** One short contextual sheet owns its local criteria draft until explicit apply or dismissal. */
export default function ModerationFiltersRoute() {
  return (
    <ModerationFilters
      initial={moderationRouteFilters(useLocalSearchParams())}
    />
  );
}
