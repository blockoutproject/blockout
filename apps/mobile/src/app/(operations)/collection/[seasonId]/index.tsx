import { useLocalSearchParams } from "expo-router";
import { CollectionSeasonScreen } from "@/features/collection/screens/collection-season-screen";

/** Canonical season context is selected by navigation, never inferred from source URLs. */
export default function CollectionSeasonRoute() {
  const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
  return <CollectionSeasonScreen seasonId={seasonId} />;
}
