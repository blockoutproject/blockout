import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { useOperationalAdmission } from "../../../../../features/access/queries/use-access-admission";
import { ClassificationScreen } from "../../../../../features/sporting-administration/screens/classification-screen";
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
    <ClassificationScreen
      key={`${params.data.kind}:${params.data.id}`}
      target={params.data}
    />
  );
}
