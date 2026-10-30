import { useLocalSearchParams } from "expo-router";
import { OwnContributionsScreen } from "../../../../features/contributions/screens/own-contributions-screen";

/** Ordinary private-history route; original account and current permissions remain owned by the feature read. */
export default function OwnContributionsRoute() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  return <OwnContributionsScreen matchId={matchId} />;
}
