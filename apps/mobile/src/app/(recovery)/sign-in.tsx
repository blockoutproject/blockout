import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { SignInScreen } from "@/features/accounts/screens/sign-in-screen";
import { useLocalSearchParams } from "expo-router";
import { accountReturnPath } from "@/features/accounts/navigation/account-return-path";

/** F05 route; the F12 owner supplies current ordinary admission without a deep-link bypass. */
export default function SignInRoute() {
  const { returnTo } = useLocalSearchParams();
  return (
    <SignInScreen
      admitted={useAccessAdmission().ordinary}
      returnTo={accountReturnPath(returnTo)}
    />
  );
}
