import { useLocalSearchParams } from "expo-router";
import { TeamScreen } from "../../../features/sporting/screens/team-screen";

/** UUID route preserves the exact team, including a professional team without a club. */
export default function TeamRoute() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  return <TeamScreen teamId={teamId} />;
}
