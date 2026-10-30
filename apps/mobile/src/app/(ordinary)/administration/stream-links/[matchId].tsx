import { useLocalSearchParams } from "expo-router";
import { ModerationMatchScreen } from "../../../../features/contributions/screens/moderation-match-screen";

/** Keeps the exact retained match identity through private history and native confirmation. */
export default function ModerationMatchRoute() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  return <ModerationMatchScreen key={matchId} matchId={matchId} />;
}
