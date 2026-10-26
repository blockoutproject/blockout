import { EditorPage } from "../../../features/sporting-administration/components/editor-page";
import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";
import { MaintenanceSettingsScreen } from "../../../features/access/screens/maintenance-settings-screen";
import { AccessDenied } from "../../../shared/components/request-feedback";

/** Requires current operational admission before mounting the authorized settings editor. */
export default function MaintenanceRoute() {
  return useOperationalAdmission() ? (
    <MaintenanceSettingsScreen />
  ) : (
    <EditorPage
      title="Administration technique"
      state={
        <AccessDenied message="L’accès à l’application doit être vérifié avant de continuer." />
      }
    />
  );
}
