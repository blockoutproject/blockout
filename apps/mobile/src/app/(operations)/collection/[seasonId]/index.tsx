import { useLocalSearchParams } from "expo-router";
import { SeasonPreparationScreen } from "../../../../features/collection/screens/season-preparation-screen";

/** Canonical season context is selected by navigation, never inferred from source URLs. */
export default function SeasonPreparationRoute() {
  const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
  return <SeasonPreparationScreen seasonId={seasonId} />;
}
