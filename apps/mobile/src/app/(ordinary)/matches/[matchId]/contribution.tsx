import { useLocalSearchParams } from "expo-router";
import { ContributionScreen } from "../../../../features/contributions/screens/contribution-screen";

/** Ordinary native stack entry; no deferred write is attached to authentication. */
export default function ContributionRoute() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  return <ContributionScreen matchId={matchId} />;
}
