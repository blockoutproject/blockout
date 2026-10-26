import { ErrorState } from "../../../shared/components/state-card";
import { EditorPage } from "../../../features/sporting-administration/components/editor-page";
import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";
import { MaintenanceSettingsScreen } from "../../../features/access/screens/maintenance-settings-screen";

/** Requires current operational admission before mounting the authorized settings editor. */
export default function MaintenanceRoute() {
  return useOperationalAdmission() ? (
    <MaintenanceSettingsScreen />
  ) : (
    <EditorPage title="Administration technique" state={<ErrorState />} />
  );
}
