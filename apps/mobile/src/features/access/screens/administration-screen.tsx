import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import {
  Page,
  PageContent,
  PageScrollView,
} from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";

import { RequestLoading } from "../../../shared/components/request-feedback";

import { Button } from "../../../shared/components/button";
import { PageHeader } from "../../../shared/components/page-header";
import { NavigationLink } from "../../../shared/components/navigation-link";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";
import { canReadDivisions } from "../division-catalog-access";

/** Admission is supplied by the route owner, independently of command visibility. */
export interface AdministrationScreenProps {
  admitted: boolean;
  /** Explicit personal choice supplied only by the current root admission owner. */
  onBypass?: () => void;
}

/**
 * Presents each technical destination under its own literal grant, without executing an operation.
 * Settings screens and operational route admission remain with their owning F12 tasks.
 */
export function AdministrationScreen({
  admitted,
  onBypass,
}: AdministrationScreenProps) {
  const { permissions, hasCommands, account, sessionStatus } =
    useAdministrationCapabilities();
  let content = null;
  if (!admitted) {
    content = <ErrorState />;
  } else if (
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" && account.isPending)
  ) {
    content = <RequestLoading />;
  } else if (sessionStatus === "authenticated" && account.isError) {
    content = (
      <ErrorState
        onRetry={() => void account.refetch()}
        retrying={account.isFetching}
      />
    );
  } else if (!hasCommands && !onBypass) {
    content = <ErrorState />;
  } else {
    content = (
      <>
        {onBypass && (
          <Button
            label="Accéder à l’application pendant la maintenance"
            onPress={onBypass}
            fullWidth
          />
        )}
        {permissions?.manageMaintenance === true && (
          <NavigationLink
            href="/administration/maintenance"
            label="Maintenance"
          />
        )}
        {permissions?.manageApplicationVersions === true && (
          <NavigationLink
            href="/administration/application-versions"
            label="Versions minimales"
          />
        )}
        {canReadDivisions(permissions) && (
          <NavigationLink href="/administration/divisions" label="Divisions" />
        )}
        {permissions?.manageCollection === true && (
          <NavigationLink href="/collection" label="Collectes" />
        )}
      </>
    );
  }
  const blocked =
    !admitted ||
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" &&
      (account.isPending || account.isError)) ||
    (!hasCommands && !onBypass);
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<PageHeader title="Administration technique" />}>
        {({ onScroll, headerHeight }) => (
          <PageScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
            refreshControl={
              !blocked && sessionStatus === "authenticated" ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  refreshing={account.isRefetching}
                  onRefresh={() => void account.refetch()}
                />
              ) : undefined
            }
          >
            {blocked ? (
              <ScreenState>{content}</ScreenState>
            ) : (
              <PageContent>{content}</PageContent>
            )}
          </PageScrollView>
        )}
      </ScrollChrome>
    </Page>
  );
}
