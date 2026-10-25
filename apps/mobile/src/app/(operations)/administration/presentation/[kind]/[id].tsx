import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { useEditorDiscard } from "../../../../../features/sporting-administration/forms/use-editor-discard";
import { useOperationalAdmission } from "../../../../../features/access/queries/use-access-admission";
import { PresentationScreen } from "../../../../../features/sporting-administration/screens/presentation-screen";
import type { PresentationTarget } from "../../../../../features/sporting-administration/api/presentation";
import { RequestError } from "../../../../../shared/components/request-feedback";
import { useAccountSession } from "../../../../../features/accounts/current-account";
import { discardPresentationEditor } from "../../../../../features/sporting-administration/forms/presentation-editor";

const targetSchema = z.object({
  kind: z.enum(["club", "team", "pool", "division"]),
  id: z.string().uuid(),
});
/** Requires the actual F12 operational group and a valid original resource before mounting private queries. */
export default function PresentationRoute() {
  const admitted = useOperationalAdmission();
  const params = targetSchema.safeParse(useLocalSearchParams());
  if (!admitted)
    return (
      <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
    );
  if (!params.success)
    return <RequestError message="Cette ressource est introuvable." />;
  return (
    <AdmittedPresentation
      key={`${params.data.kind}:${params.data.id}`}
      target={params.data}
    />
  );
}
/** Uses the installed router's native removal guard; identity invalidation remains owned by F05/F12. */
function AdmittedPresentation({ target }: { target: PresentationTarget }) {
  const [dirty, setDirty] = useState(false);
  const session = useAccountSession();
  useEditorDiscard(dirty, () => {
    discardPresentationEditor(session.generation, target);
    setDirty(false);
  });
  return <PresentationScreen target={target} onDirtyChange={setDirty} />;
}
