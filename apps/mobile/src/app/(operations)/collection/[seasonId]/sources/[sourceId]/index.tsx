import { useLocalSearchParams } from "expo-router";
import { SourcePreparationScreen } from "../../../../../../features/collection/screens/source-preparation-screen";
import { usePreparationDiscard } from "../../../../../../features/collection/forms/use-preparation-discard";
import { discardSourcePreparationEditor } from "../../../../../../features/collection/forms/preparation-editors";

/** Source editing stays on an ordinary route; its draft is discarded only by native explicit confirmation. */
export default function SourcePreparationRoute() {
  const { seasonId, sourceId } = useLocalSearchParams<{
    seasonId: string;
    sourceId: string;
  }>();
  const onDirtyChange = usePreparationDiscard(discardSourcePreparationEditor);
  return (
    <SourcePreparationScreen
      seasonId={seasonId}
      sourceId={sourceId}
      onDirtyChange={onDirtyChange}
    />
  );
}
