import { ErrorState } from "../../../../shared/components/state-card";
import { PreparationPage } from "../../../../features/collection/components/preparation-layout";
import { useLocalSearchParams } from "expo-router";
import { CollectionControlScreen } from "../../../../features/collection/screens/collection-dashboard-screen";

/** Only the two seasonless families are admitted here; competition controls require an explicit season route. */
export default function ClubCollectionRoute() {
  const { family } = useLocalSearchParams<{ family: string }>();
  return family === "club-sheets" || family === "geocoding" ? (
    <CollectionControlScreen family={family} />
  ) : (
    <PreparationPage title="Collectes" state={<ErrorState />} />
  );
}
