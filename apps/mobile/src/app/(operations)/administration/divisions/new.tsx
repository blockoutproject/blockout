import { useState } from "react";
import { useOperationalAdmission } from "../../../../features/access/queries/use-access-admission";
import { useAccountSession } from "../../../../features/accounts/current-account";
import { PresentationScreen } from "../../../../features/sporting-administration/screens/presentation-screen";
import { discardPresentationEditor } from "../../../../features/sporting-administration/forms/presentation-editor";
import { useEditorDiscard } from "../../../../features/sporting-administration/forms/use-editor-discard";
import { RequestError } from "../../../../shared/components/request-feedback";
/** Division creation reuses the single existing name/color/logo form and its atomic save path. */
export default function CreateDivisionRoute() {
  const admitted = useOperationalAdmission();
  const session = useAccountSession();
  const [dirty, setDirty] = useState(false);
  useEditorDiscard(dirty, () => {
    discardPresentationEditor(session.generation, {
      kind: "division-creation",
    });
    setDirty(false);
  });
  return admitted ? (
    <PresentationScreen
      target={{ kind: "division-creation" }}
      onDirtyChange={setDirty}
    />
  ) : (
    <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
  );
}
