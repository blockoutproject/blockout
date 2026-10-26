import { PreparationPage } from "../../../features/collection/components/preparation-layout";
import { Stack } from "expo-router";
import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";
import { AccessDenied } from "../../../shared/components/request-feedback";

/** Collection operations retain F12's current minimum-version/identity admission independently of ordinary access. */
export default function CollectionLayout() {
  return useOperationalAdmission() ? (
    <Stack screenOptions={{ headerShown: false }} />
  ) : (
    <PreparationPage
      title="Collectes"
      state={
        <AccessDenied message="L’accès à l’application doit être vérifié avant de continuer." />
      }
    />
  );
}
