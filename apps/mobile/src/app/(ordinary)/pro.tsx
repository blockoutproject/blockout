import { useLocalSearchParams, useRouter } from "expo-router";
import { useAccessAdmission } from "../../features/access/queries/use-access-admission";
import { ProPresentationScreen } from "../../features/pro/presentation";
import { supportHref } from "../../features/support";

/** Thin native provider route; ordinary F12 admission remains authoritative. */
export default function ProRoute() {
  const { management } = useLocalSearchParams<{ management?: string }>();
  const router = useRouter();
  return (
    <ProPresentationScreen
      admitted={useAccessAdmission().ordinary}
      management={management === "1"}
      onSupport={() => router.push(supportHref({ screen: "pro" }))}
    />
  );
}
