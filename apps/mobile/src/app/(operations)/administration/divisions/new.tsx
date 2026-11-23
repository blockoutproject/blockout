import { ScreenState } from "@/shared/components/screen-state";
import { PageHeader } from "@/shared/components/page-header";
import { Page, PageScrollView } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";

import { useOperationalAdmission } from "@/features/access/queries/use-access-admission";
import { CreateDivisionScreen } from "@/features/sporting-administration/screens/create-division-screen";

/** F12 operational admission precedes the creation visit. */
export default function CreateDivisionRoute() {
  const admitted = useOperationalAdmission();
  return admitted ? (
    <CreateDivisionScreen />
  ) : (
    <Page header={<PageHeader title="Administration technique" />}>
      <PageScrollView>
        <ScreenState>
          <ErrorState />
        </ScreenState>
      </PageScrollView>
    </Page>
  );
}
