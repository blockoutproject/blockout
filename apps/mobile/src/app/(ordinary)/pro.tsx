import { useLocalSearchParams } from "expo-router";
import { useAccountAdmission } from "../../features/accounts/components/account-admission";
import { ProPresentationScreen } from "../../features/pro/presentation";

/** Thin native provider route; ordinary F12 admission remains authoritative. */
export default function ProRoute() {
  const { management } = useLocalSearchParams<{ management?: string }>();
  return (
    <ProPresentationScreen
      admitted={useAccountAdmission()}
      management={management === "1"}
    />
  );
}
