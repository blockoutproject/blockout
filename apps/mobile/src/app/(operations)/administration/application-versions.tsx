import { ErrorState } from "../../../shared/components/state-card";
import { EditorPage } from "../../../features/sporting-administration/components/editor-page";
import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";
import { ApplicationVersionsSettingsScreen } from "../../../features/access/screens/application-versions-settings-screen";

/** Requires current operational admission before mounting the authorized settings editor. */
export default function ApplicationVersionsRoute() {
  return useOperationalAdmission() ? (
    <ApplicationVersionsSettingsScreen />
  ) : (
    <EditorPage title="Administration technique" state={<ErrorState />} />
  );
}
