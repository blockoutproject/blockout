import { useAccountAdmission } from "../../../../features/accounts/components/account-admission";
import { EraseAccountScreen } from "../../../../features/accounts/screens/erase-account-screen";

/** Ordinary Profile stack destination; F12 retains admission and F05 owns confirmation. */
export default function EraseAccountRoute() {
  return <EraseAccountScreen admitted={useAccountAdmission()} />;
}
