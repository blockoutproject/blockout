import { Stack } from "expo-router";
import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";
import { RequestError } from "../../../shared/components/request-feedback";

/** Collection operations retain F12's current minimum-version/identity admission independently of ordinary access. */
export default function CollectionLayout() {
  return useOperationalAdmission() ? (
    <Stack screenOptions={{ headerShown: false }} />
  ) : (
    <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
  );
}
