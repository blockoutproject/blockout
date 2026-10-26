import { ErrorState } from "../../../shared/components/state-card";
import { Sheet } from "../../../shared/components/sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import { z } from "zod";

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
  const router = useRouter();
  const params = selection.safeParse(useLocalSearchParams());
  return admitted && params.success ? (
    <ClassificationSelectionScreen
      target={params.data}
      field={params.data.field}
    />
  ) : (
    <Sheet title="Classification" onClose={() => router.back()}>
      {admitted ? <ErrorState /> : <ErrorState />}
    </Sheet>
  );
}
