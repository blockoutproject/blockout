import { PreparationPage } from "../../../../features/collection/components/preparation-layout";
import { useLocalSearchParams } from "expo-router";
import { CollectionControlScreen } from "../../../../features/collection/screens/collection-dashboard-screen";
import { RequestError } from "../../../../shared/components/request-feedback";

/** Only the two seasonless families are admitted here; competition controls require an explicit season route. */
export default function ClubCollectionRoute() {
  const { family } = useLocalSearchParams<{ family: string }>();
  return family === "club-sheets" || family === "geocoding" ? (
    <CollectionControlScreen family={family} />
  ) : (
    <PreparationPage
      title="Collectes"
      state={
        <RequestError message="Ce périmètre de collecte est indisponible." />
      }
    />
  );
}
