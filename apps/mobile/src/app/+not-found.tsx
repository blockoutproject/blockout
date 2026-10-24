import { Redirect } from "expo-router";
import { useAccessAdmission } from "../features/access/queries/use-access-admission";

/** Unknown deep links return to the applicable admission destination without exposing an ungated fallback. */
export default function NotFoundRoute() {
  const access = useAccessAdmission();
  return <Redirect href={access.ordinary ? "/" : "/access"} />;
}
