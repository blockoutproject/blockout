import { useLocalSearchParams } from "expo-router";
import { MatchScreen } from "../../../features/sporting/screens/match-screen";

/** UUID route delegates dated/visible availability to the public read boundary. */
export default function MatchRoute() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  return <MatchScreen matchId={matchId} />;
}
