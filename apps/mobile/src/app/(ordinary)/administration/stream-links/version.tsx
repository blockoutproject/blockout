import { useLocalSearchParams } from "expo-router";
import { ModerationVersionSheet } from "../../../../features/contributions/components/moderation-version-sheet";

/** Opens the exact related version in the existing contextual native sheet presentation. */
export default function ModerationVersionRoute() {
  const { matchId, versionId, relation } = useLocalSearchParams<{
    matchId: string;
    versionId: string;
    relation?: string;
  }>();
  return (
    <ModerationVersionSheet
      key={versionId}
      matchId={matchId}
      versionId={versionId}
      relation={relation}
    />
  );
}
