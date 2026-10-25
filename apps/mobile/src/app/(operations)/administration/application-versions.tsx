import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";
import { ApplicationVersionsSettingsScreen } from "../../../features/access/screens/application-versions-settings-screen";
import { RequestError } from "../../../shared/components/request-feedback";

/** Requires current operational admission before mounting the authorized settings editor. */
export default function ApplicationVersionsRoute() {
  return useOperationalAdmission() ? (
    <ApplicationVersionsSettingsScreen />
  ) : (
    <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
  );
}
