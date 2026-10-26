import { ErrorState } from "../../../../../shared/components/state-card";
import { EditorPage } from "../../../../../features/sporting-administration/components/editor-page";
import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { useOperationalAdmission } from "../../../../../features/access/queries/use-access-admission";
import { PresentationScreen } from "../../../../../features/sporting-administration/screens/presentation-screen";

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
      <EditorPage title="Administration technique" state={<ErrorState />} />
    );
  if (!params.success)
    return (
      <EditorPage title="Administration technique" state={<ErrorState />} />
    );
  return (
    <PresentationScreen
      key={`${params.data.kind}:${params.data.id}`}
      target={params.data}
    />
  );
}
