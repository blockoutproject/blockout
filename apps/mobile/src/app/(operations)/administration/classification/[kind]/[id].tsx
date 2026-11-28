import { useLocalSearchParams, useRouter } from "expo-router";
import { z } from "zod";
import { useOperationalAdmission } from "@/features/access/queries/use-access-admission";
import { ClassificationScreen } from "@/features/sporting-administration/screens/classification-screen";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { ErrorState } from "@/shared/components/state-card";

const targetSchema = z.object({
  kind: z.enum(["pack", "pool"]),
  id: z.string().uuid(),
});

/** The route title and subtitle describe the parent row; only the original UUID identifies a write. */
export default function ClassificationRoute() {
  const admitted = useOperationalAdmission();
  const router = useRouter();
  const params = useLocalSearchParams();
  const target = targetSchema.safeParse(params);
  if (!admitted || !target.success) {
    return (
      <Sheet title="Classification" onClose={() => router.back()}>
        <SheetContent>
          <ErrorState />
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <ClassificationScreen
      key={`${target.data.kind}:${target.data.id}`}
      target={target.data}
      title={typeof params.title === "string" ? params.title : undefined}
      subtitle={
        typeof params.subtitle === "string" ? params.subtitle : undefined
      }
    />
  );
}
