import { ErrorState } from "../../../../../shared/components/state-card";
import { PreparationPage } from "../../../../../features/collection/components/preparation-layout";
import { useLocalSearchParams } from "expo-router";
import { CollectionControlScreen } from "../../../../../features/collection/screens/collection-dashboard-screen";

/** Commands target exactly the selected season and one supported competition provider. */
export default function CompetitionCollectionRoute() {
  const { seasonId, provider } = useLocalSearchParams<{
    seasonId: string;
    provider: string;
  }>();
  return provider === "ffvb" || provider === "lnv" ? (
    <CollectionControlScreen family={provider} seasonId={seasonId} />
  ) : (
    <PreparationPage title="Collectes" state={<ErrorState />} />
  );
}
