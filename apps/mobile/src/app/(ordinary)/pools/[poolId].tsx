import { useLocalSearchParams } from "expo-router";
import { PoolScreen } from "../../../features/sporting/screens/pool-screen";

/** UUID route keeps same-named phases separate under ordinary admission. */
export default function PoolRoute() {
  const { poolId } = useLocalSearchParams<{ poolId: string }>();
  return <PoolScreen poolId={poolId} />;
}
