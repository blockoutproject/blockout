import { useLocalSearchParams } from "expo-router";
import { SourcePreparationScreen } from "../../../../../../features/collection/screens/source-preparation-screen";

/** Source editing stays on an ordinary route; its draft is discarded only by native explicit confirmation. */
export default function SourcePreparationRoute() {
  const { seasonId, sourceId } = useLocalSearchParams<{
    seasonId: string;
    sourceId: string;
  }>();
  return <SourcePreparationScreen seasonId={seasonId} sourceId={sourceId} />;
}
