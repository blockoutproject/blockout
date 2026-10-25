import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { useOperationalAdmission } from "../../../../../features/access/queries/use-access-admission";
import { useAccountSession } from "../../../../../features/accounts/current-account";
import type { ClassificationTarget } from "../../../../../features/sporting-administration/api/classification";
import { ClassificationScreen } from "../../../../../features/sporting-administration/screens/classification-screen";
import { discardClassificationEditor } from "../../../../../features/sporting-administration/forms/classification-editor";
import { useEditorDiscard } from "../../../../../features/sporting-administration/forms/use-editor-discard";
import { RequestError } from "../../../../../shared/components/request-feedback";
const targetSchema = z.object({
  kind: z.enum(["pack", "pool"]),
  id: z.string().uuid(),
});
/** Requires actual F12 operational admission and a valid original correction scope. */
export default function ClassificationRoute() {
  const admitted = useOperationalAdmission();
  const params = targetSchema.safeParse(useLocalSearchParams());
  if (!admitted)
    return (
      <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
    );
  if (!params.success)
    return <RequestError message="Cette ressource est introuvable." />;
  return (
    <AdmittedClassification
      key={`${params.data.kind}:${params.data.id}`}
      target={params.data}
    />
  );
}
/** Retains the same draft through admission suspension and confirms deliberate navigation removal. */
function AdmittedClassification({ target }: { target: ClassificationTarget }) {
  const [dirty, setDirty] = useState(false);
  const session = useAccountSession();
  useEditorDiscard(dirty, () => {
    discardClassificationEditor(session.generation, target);
    setDirty(false);
  });
  return <ClassificationScreen target={target} onDirtyChange={setDirty} />;
}
