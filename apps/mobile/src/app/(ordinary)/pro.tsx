import { useLocalSearchParams, useRouter } from "expo-router";
import { useAccountAdmission } from "../../features/accounts/components/account-admission";
import { ProPresentationScreen } from "../../features/pro/presentation";
import { supportHref } from "../../features/support";

/** Thin native provider route; ordinary F12 admission remains authoritative. */
export default function ProRoute() {
  const { management } = useLocalSearchParams<{ management?: string }>();
  const router = useRouter();
  return (
    <ProPresentationScreen
      admitted={useAccountAdmission()}
      management={management === "1"}
      onSupport={() => router.push(supportHref({ screen: "pro" }))}
    />
  );
}
