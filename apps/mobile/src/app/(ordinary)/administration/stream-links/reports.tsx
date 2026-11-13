import { useLocalSearchParams } from "expo-router";
import { ModerationReportsScreen } from "@/features/contributions/screens/moderation-reports-screen";

/** Keeps each exact-version traversal separate while native Back restores its existing caller. */
export default function ModerationReportsRoute() {
  const { matchId, versionId } = useLocalSearchParams<{
    matchId: string;
    versionId: string;
  }>();
  return (
    <ModerationReportsScreen
      key={`${matchId}/${versionId}`}
      matchId={matchId}
      versionId={versionId}
    />
  );
}
