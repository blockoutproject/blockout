import { ScreenState } from "../../../../shared/components/screen-state";
import { PageHeader } from "../../../../shared/components/page-header";
import { Page, PageScrollView } from "../../../../shared/components/page";
import { ErrorState } from "../../../../shared/components/state-card";

import { useOperationalAdmission } from "../../../../features/access/queries/use-access-admission";
import { PresentationScreen } from "../../../../features/sporting-administration/screens/presentation-screen";

/** Creation uses the existing presentation form, draft and native removal guard. */
export default function CreateDivisionRoute() {
  const admitted = useOperationalAdmission();
  return admitted ? (
    <PresentationScreen target={{ kind: "division-creation" }} />
  ) : (
    <Page>
      <PageHeader title="Administration technique" />
      <PageScrollView>
        <ScreenState>
          <ErrorState />
        </ScreenState>
      </PageScrollView>
    </Page>
  );
}
