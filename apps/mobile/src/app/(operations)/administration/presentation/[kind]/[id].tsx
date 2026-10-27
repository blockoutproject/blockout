import { ScreenState } from "../../../../../shared/components/screen-state";
import { PageHeader } from "../../../../../shared/components/page-header";
import { Page, PageScrollView } from "../../../../../shared/components/page";
import { ErrorState } from "../../../../../shared/components/state-card";

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
  if (!admitted || !params.success)
    return (
      <Page>
        <PageHeader title="Administration technique" />
        <PageScrollView>
          <ScreenState>
            <ErrorState />
          </ScreenState>
        </PageScrollView>
      </Page>
    );
  return (
    <PresentationScreen
      key={`${params.data.kind}:${params.data.id}`}
      target={params.data}
    />
  );
}
