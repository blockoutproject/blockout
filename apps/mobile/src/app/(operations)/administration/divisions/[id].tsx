import { ScreenState } from "../../../../shared/components/screen-state";
import { PageHeader } from "../../../../shared/components/page-header";
import { Page, PageScrollView } from "../../../../shared/components/page";
import { ErrorState } from "../../../../shared/components/state-card";

import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { useOperationalAdmission } from "../../../../features/access/queries/use-access-admission";
import { PresentationScreen } from "../../../../features/sporting-administration/screens/presentation-screen";

/** The division editor admits presentation and lifecycle operators, keeping their commands independent. */
export default function DivisionRoute() {
  const admitted = useOperationalAdmission();
  const params = z
    .object({ id: z.string().uuid() })
    .safeParse(useLocalSearchParams());
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
      key={params.data.id}
      target={{ kind: "division", id: params.data.id }}
    />
  );
}
