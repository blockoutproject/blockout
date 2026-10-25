import { useLocalSearchParams } from "expo-router";
import { TeamScreen } from "../../../features/sporting/screens/team-screen";
import { SportingActions } from "../../../features/sporting/components/sporting-actions";

/** UUID route preserves the exact team, including a professional team without a club. */
export default function TeamRoute() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  return (
    <TeamScreen
      teamId={teamId}
      renderFollow={(identity, season, contextColor) => (
        <SportingActions
          target={{ type: "team", id: identity.id }}
          season={season}
          contextColor={contextColor}
        />
      )}
    />
  );
}
