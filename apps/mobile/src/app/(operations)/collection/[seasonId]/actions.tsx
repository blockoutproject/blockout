import { useLocalSearchParams } from "expo-router";
import { SeasonActionsSheet } from "@/features/collection/screens/season-actions-sheet";

export default function SeasonActionsRoute() {
  const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
  return <SeasonActionsSheet seasonId={seasonId} />;
}
