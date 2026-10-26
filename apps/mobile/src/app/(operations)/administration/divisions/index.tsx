import { EditorPage } from "../../../../features/sporting-administration/components/editor-page";
import { useOperationalAdmission } from "../../../../features/access/queries/use-access-admission";
import { DivisionsScreen } from "../../../../features/sporting-administration/screens/divisions-screen";
import { AccessDenied } from "../../../../shared/components/request-feedback";
/** Keeps isolated mounts closed; the screen additionally enforces each canonical read/action grant. */
export default function DivisionsRoute() {
  return useOperationalAdmission() ? (
    <DivisionsScreen />
  ) : (
    <EditorPage
      title="Administration technique"
      state={
        <AccessDenied message="L’accès à l’application doit être vérifié avant de continuer." />
      }
    />
  );
}
