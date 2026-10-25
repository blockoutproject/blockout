import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { RequestError } from "../../../shared/components/request-feedback";
import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";
import { ClassificationSelectionScreen } from "../../../features/sporting-administration/screens/classification-selection-screen";
const selection = z.object({
  kind: z.enum(["pack", "pool"]),
  id: z.string().uuid(),
  field: z.enum(["divisionId", "format", "gender"]),
});
/** Validates a native field-selection route before accessing the original session's draft. */
export default function ClassificationSelectionRoute() {
  const admitted = useOperationalAdmission();
  const params = selection.safeParse(useLocalSearchParams());
  return admitted && params.success ? (
    <ClassificationSelectionScreen
      target={params.data}
      field={params.data.field}
    />
  ) : (
    <RequestError message="Cette sélection est indisponible." />
  );
}
