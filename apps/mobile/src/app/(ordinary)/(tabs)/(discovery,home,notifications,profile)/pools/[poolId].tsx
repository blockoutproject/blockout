import { useLocalSearchParams } from "expo-router";
import { PoolScreen } from "@/features/sporting/screens/pool-screen";
import { SportingActions } from "@/features/sporting/components/sporting-actions";
import { useFollowStateQuery } from "@/features/following";

/** UUID route keeps same-named phases separate under ordinary admission. */
export default function PoolRoute() {
  const { poolId } = useLocalSearchParams<{ poolId: string }>();
  const target = { type: "pool", id: poolId } as const;
  const follow = useFollowStateQuery(target);
  return (
    <PoolScreen
      poolId={poolId}
      initialFollow={follow.usable ? follow.query : undefined}
      renderFollow={(_identity, season) => (
        <SportingActions target={target} season={season} read={follow} />
      )}
    />
  );
}
