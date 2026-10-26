import { EditorPage } from "../../../../features/sporting-administration/components/editor-page";
import { useOperationalAdmission } from "../../../../features/access/queries/use-access-admission";
import { PresentationScreen } from "../../../../features/sporting-administration/screens/presentation-screen";
import { AccessDenied } from "../../../../shared/components/request-feedback";
/** Creation uses the existing presentation form, draft and native removal guard. */
export default function CreateDivisionRoute() {
  const admitted = useOperationalAdmission();
  return admitted ? (
    <PresentationScreen target={{ kind: "division-creation" }} />
  ) : (
    <EditorPage
      title="Administration technique"
      state={
        <AccessDenied message="L’accès à l’application doit être vérifié avant de continuer." />
      }
    />
  );
}
