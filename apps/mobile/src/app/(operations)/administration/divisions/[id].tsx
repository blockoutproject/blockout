import { EditorPage } from "../../../../features/sporting-administration/components/editor-page";
import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { useOperationalAdmission } from "../../../../features/access/queries/use-access-admission";
import { PresentationScreen } from "../../../../features/sporting-administration/screens/presentation-screen";
import {
  AccessDenied,
  RequestError,
} from "../../../../shared/components/request-feedback";
/** The division editor admits presentation and lifecycle operators, keeping their commands independent. */
export default function DivisionRoute() {
  const admitted = useOperationalAdmission();
  const params = z
    .object({ id: z.string().uuid() })
    .safeParse(useLocalSearchParams());
  if (!admitted)
    return (
      <EditorPage
        title="Administration technique"
        state={
          <AccessDenied message="L’accès à l’application doit être vérifié avant de continuer." />
        }
      />
    );
  return params.success ? (
    <PresentationScreen
      key={params.data.id}
      target={{ kind: "division", id: params.data.id }}
    />
  ) : (
    <EditorPage
      title="Administration technique"
      state={<RequestError message="Cette division est introuvable." />}
    />
  );
}
