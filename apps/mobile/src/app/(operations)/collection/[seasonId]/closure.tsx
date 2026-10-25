import { useLocalSearchParams } from "expo-router";
import { CloseSeasonScreen } from "../../../../features/collection/screens/close-season-screen";

/** Definitive exact-label confirmation uses an ordinary screen with native back navigation. */
export default function CloseSeasonRoute() {
  const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
  return <CloseSeasonScreen seasonId={seasonId} />;
}
