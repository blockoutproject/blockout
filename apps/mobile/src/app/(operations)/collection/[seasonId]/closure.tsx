import { useLocalSearchParams } from "expo-router";
import { SeasonConfirmationScreen } from "@/features/collection/screens/season-confirmation-screen";

/** Definitive exact-label confirmation uses an ordinary screen with native back navigation. */
export default function CloseSeasonRoute() {
  const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
  return <SeasonConfirmationScreen seasonId={seasonId} command="closure" />;
}
