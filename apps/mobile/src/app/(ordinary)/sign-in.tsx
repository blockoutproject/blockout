import { useAccountAdmission } from "../../features/accounts/components/account-admission";
import { SignInScreen } from "../../features/accounts/screens/sign-in-screen";

/** F05 route; the F12 owner supplies current ordinary admission without a deep-link bypass. */
export default function SignInRoute() {
  return <SignInScreen admitted={useAccountAdmission()} />;
}
