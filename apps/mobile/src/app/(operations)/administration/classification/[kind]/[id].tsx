import { ErrorState } from "../../../../../shared/components/state-card";
import { EditorPage } from "../../../../../features/sporting-administration/components/editor-page";
import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { useOperationalAdmission } from "../../../../../features/access/queries/use-access-admission";
import { ClassificationScreen } from "../../../../../features/sporting-administration/screens/classification-screen";

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
      <EditorPage title="Administration technique" state={<ErrorState />} />
    );
  if (!params.success)
    return (
      <EditorPage title="Administration technique" state={<ErrorState />} />
    );
  return (
    <ClassificationScreen
      key={`${params.data.kind}:${params.data.id}`}
      target={params.data}
    />
  );
}
