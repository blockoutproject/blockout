import { useLocalSearchParams } from "expo-router";
import { CollectionControlScreen } from "../../../../../features/collection/screens/collection-dashboard-screen";
import { RequestError } from "../../../../../shared/components/request-feedback";

/** Commands target exactly the selected season and one supported competition provider. */
export default function CompetitionCollectionRoute() {
  const { seasonId, provider } = useLocalSearchParams<{
    seasonId: string;
    provider: string;
  }>();
  return provider === "ffvb" || provider === "lnv" ? (
    <CollectionControlScreen family={provider} seasonId={seasonId} />
  ) : (
    <RequestError message="Ce périmètre de collecte est indisponible." />
  );
}
