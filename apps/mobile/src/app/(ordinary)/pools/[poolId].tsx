import { useLocalSearchParams } from "expo-router";
import { PoolScreen } from "../../../features/sporting/screens/pool-screen";
import { SportingActions } from "../../../features/sporting/components/sporting-actions";

/** UUID route keeps same-named phases separate under ordinary admission. */
export default function PoolRoute() {
  const { poolId } = useLocalSearchParams<{ poolId: string }>();
  return (
    <PoolScreen
      poolId={poolId}
      renderFollow={(identity, season) => (
        <SportingActions
          target={{ type: "pool", id: identity.id }}
          season={season}
        />
      )}
    />
  );
}
