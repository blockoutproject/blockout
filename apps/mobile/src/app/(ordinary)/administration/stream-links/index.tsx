import { useLocalSearchParams } from "expo-router";
import { ModerationScreen } from "../../../../features/contributions/screens/moderation-screen";
import { moderationRouteFilters } from "../../../../features/contributions/model/moderation-route-filters";

/** Ordinary admission remains with the root; the feature requires the current literal video grant. */
export default function ModerationRoute() {
  return (
    <ModerationScreen
      filters={moderationRouteFilters(useLocalSearchParams())}
    />
  );
}
