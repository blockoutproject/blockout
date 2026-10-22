import { useAccountAdmission } from "../../features/accounts/components/account-admission";
import { AdministrationScreen } from "../../features/access/screens/administration-screen";

/** Keeps admission at its existing closed boundary until F12 T028 composes operational routes. */
export default function AdministrationRoute() {
  return <AdministrationScreen admitted={useAccountAdmission()} />;
}
