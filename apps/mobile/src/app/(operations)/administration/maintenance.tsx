import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";
import { MaintenanceSettingsScreen } from "../../../features/access/screens/maintenance-settings-screen";
import { RequestError } from "../../../shared/components/request-feedback";

/** Requires current operational admission before mounting the authorized settings editor. */
export default function MaintenanceRoute() {
  return useOperationalAdmission() ? (
    <MaintenanceSettingsScreen />
  ) : (
    <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
  );
}
