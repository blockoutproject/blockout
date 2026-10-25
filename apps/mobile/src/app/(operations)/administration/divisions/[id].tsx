import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { useOperationalAdmission } from "../../../../features/access/queries/use-access-admission";
import { PresentationEditorScreen } from "../../../../features/sporting-administration/screens/presentation-editor-screen";
import { RequestError } from "../../../../shared/components/request-feedback";
/** The division editor admits presentation and lifecycle operators, keeping their commands independent. */
export default function DivisionRoute() {
  const admitted = useOperationalAdmission();
  const params = z
    .object({ id: z.string().uuid() })
    .safeParse(useLocalSearchParams());
  if (!admitted)
    return (
      <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
    );
  return params.success ? (
    <PresentationEditorScreen
      key={params.data.id}
      target={{ kind: "division", id: params.data.id }}
    />
  ) : (
    <RequestError message="Cette division est introuvable." />
  );
}
