import { useLocalSearchParams } from "expo-router";
import { SourceChildrenScreen } from "../../../../../../features/collection/screens/source-children-screen";

/** Read-only child navigation retains the source and optional native pack scope. */
export default function SourceChildrenRoute() {
  const { seasonId, sourceId, parentId } = useLocalSearchParams<{
    seasonId: string;
    sourceId: string;
    parentId?: string;
  }>();
  return (
    <SourceChildrenScreen
      seasonId={seasonId}
      sourceId={sourceId}
      parentId={parentId}
    />
  );
}
