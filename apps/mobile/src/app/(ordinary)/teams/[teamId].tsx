import { useLocalSearchParams } from "expo-router";
import { TeamScreen } from "../../../features/sporting/screens/team-screen";
import { SportingActions } from "../../../features/sporting/components/sporting-actions";
import { useFollowStateQuery } from "../../../features/following";

/** UUID route preserves the exact team, including a professional team without a club. */
export default function TeamRoute() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const target = { type: "team", id: teamId } as const;
  const follow = useFollowStateQuery(target);
  return (
    <TeamScreen
      teamId={teamId}
      initialFollow={follow.usable ? follow.query : undefined}
      renderFollow={(_identity, season) => (
        <SportingActions target={target} season={season} read={follow} />
      )}
    />
  );
}
