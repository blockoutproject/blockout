import { useIsFocused, useLocalSearchParams } from "expo-router";
import { MatchScreen } from "../../../features/sporting/screens/match-screen";

/** UUID route supplies native focus; dated/visible availability stays with the public read boundary. */
export default function MatchRoute() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const focused = useIsFocused();
  return <MatchScreen matchId={matchId} focused={focused} />;
}
