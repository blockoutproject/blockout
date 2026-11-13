import { Page, PageContent, PageScrollView } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";
import { ScreenState } from "@/shared/components/screen-state";

import { ListLoading } from "@/shared/components/list-loading";

import { Button } from "@/shared/components/button";
import { PageHeader } from "@/shared/components/page-header";
import { NavigationLink } from "@/shared/components/navigation-link";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
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
}: Readonly<AdministrationScreenProps>) {
  const { permissions, hasCommands, account, sessionStatus } =
    useAdministrationCapabilities();

  /** Selects read/session feedback before exposing independently authorized destinations. */
  function renderContent() {
    if (!admitted) {
      return <ErrorState />;
    } else if (
      sessionStatus === "restoring" ||
      (sessionStatus === "authenticated" && account.isLoading)
    ) {
      return <ListLoading label="Chargement de l’administration" />;
    } else if (
      sessionStatus === "authenticated" &&
      (account.isError || account.isPending)
    ) {
      return (
        <ErrorState
          onRetry={() => void account.refetch()}
          retrying={account.isFetching}
        />
      );
    } else if (!hasCommands && !onBypass) {
      return <ErrorState />;
    } else {
      return (
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
            <NavigationLink
              href="/administration/divisions"
              label="Divisions"
            />
          )}
          {permissions?.manageCollection === true && (
            <NavigationLink href="/collection" label="Collectes" />
          )}
        </>
      );
    }
  }

  const content = renderContent();
  const pending =
    admitted &&
    (sessionStatus === "restoring" ||
      (sessionStatus === "authenticated" && account.isLoading));
  const blocked =
    !admitted ||
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" &&
      (account.isPending || account.isError)) ||
    (!hasCommands && !onBypass);
  return (
    <Page header={<PageHeader title="Administration technique" />}>
      <PageScrollView
        refreshControl={
          !blocked && sessionStatus === "authenticated" ? (
            <DataRefreshControl onRefresh={() => account.refetch()} />
          ) : undefined
        }
      >
        {blocked && !pending ? (
          <ScreenState>{content}</ScreenState>
        ) : (
          <PageContent>{content}</PageContent>
        )}
      </PageScrollView>
    </Page>
  );
}
