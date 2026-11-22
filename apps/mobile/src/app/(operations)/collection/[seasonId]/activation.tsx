import { useLocalSearchParams } from "expo-router";
import { SeasonConfirmationScreen } from "@/features/collection/screens/season-confirmation-screen";

export default function ActivateSeasonRoute() {
  const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
  return <SeasonConfirmationScreen seasonId={seasonId} command="activation" />;
}
