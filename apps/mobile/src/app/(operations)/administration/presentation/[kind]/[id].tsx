import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { useOperationalAdmission } from "../../../../../features/access/queries/use-access-admission";
import { PresentationEditorScreen } from "../../../../../features/sporting-administration/screens/presentation-editor-screen";
import { RequestError } from "../../../../../shared/components/request-feedback";

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
    <PresentationEditorScreen
      key={`${params.data.kind}:${params.data.id}`}
      target={params.data}
    />
  );
}
