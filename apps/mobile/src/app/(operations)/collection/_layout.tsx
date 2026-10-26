import { ErrorState } from "../../../shared/components/state-card";
import { PreparationPage } from "../../../features/collection/components/preparation-layout";
import { Stack } from "expo-router";
import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";

/** Collection operations retain F12's current minimum-version/identity admission independently of ordinary access. */
export default function CollectionLayout() {
  return useOperationalAdmission() ? (
    <Stack screenOptions={{ headerShown: false }} />
  ) : (
    <PreparationPage title="Collectes" state={<ErrorState />} />
  );
}
