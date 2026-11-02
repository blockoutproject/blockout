import { useAccessAdmission } from "../../../../features/access/queries/use-access-admission";
import { EraseAccountScreen } from "../../../../features/accounts/screens/erase-account-screen";

/** Ordinary Profile stack destination; F12 retains admission and F05 owns confirmation. */
export default function EraseAccountRoute() {
  return <EraseAccountScreen admitted={useAccessAdmission().ordinary} />;
}
