import { ScreenState } from "../../../../shared/components/screen-state";
import { PageHeader } from "../../../../shared/components/page-header";
import { Page, PageScrollView } from "../../../../shared/components/page";
import { ErrorState } from "../../../../shared/components/state-card";

import { useOperationalAdmission } from "../../../../features/access/queries/use-access-admission";
import { DivisionsScreen } from "../../../../features/sporting-administration/screens/divisions-screen";

/** Keeps isolated mounts closed; the screen additionally enforces each canonical read/action grant. */
export default function DivisionsRoute() {
  return useOperationalAdmission() ? (
    <DivisionsScreen />
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
