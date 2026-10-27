import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";
import { Page, PageScrollView } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";

import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";
import { MaintenanceSettingsScreen } from "../../../features/access/screens/maintenance-settings-screen";

/** Requires current operational admission before mounting the authorized settings editor. */
export default function MaintenanceRoute() {
  return useOperationalAdmission() ? (
    <MaintenanceSettingsScreen />
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
