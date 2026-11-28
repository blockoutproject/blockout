import { useLocalSearchParams } from "expo-router";
import { SourceCatalogueScreen } from "@/features/collection/screens/source-catalogue-screen";
import { collectionSourceRouteFocus } from "@/features/collection/model/collection-route-params";

export default function SourceCatalogueRoute() {
  const params = useLocalSearchParams<{ seasonId: string; sourceId: string }>();
  return (
    <SourceCatalogueScreen
      seasonId={params.seasonId}
      sourceId={params.sourceId}
      focus={collectionSourceRouteFocus(params)}
    />
  );
}
