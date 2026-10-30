import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import {
  getGetClubLogoQueryKey,
  getGetDivisionLogoQueryKey,
  getGetTeamLogoQueryKey,
} from "../../../../.generated/mobile";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { ErrorState } from "../../../shared/components/state-card";
import { useAdministrationCapabilities } from "../../access/api/use-administration-capabilities";
import { useAccountSession } from "../../accounts/current-account";
import { usePresentation, type PresentationTarget } from "../api/presentation";
import { PresentationForm } from "../forms/presentation-form";

/** Route-owned target; the form reads its own dirty state and F12 supplies current action grants. */
export interface PresentationScreenProps {
  target: PresentationTarget;
}
/** Composes the approved editor using the platform's existing ordinary-form keyboard mechanism. */
export function PresentationScreen({ target }: PresentationScreenProps) {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const client = useQueryClient();
  const logoKey =
    target.kind === "team"
      ? getGetTeamLogoQueryKey(target.id)
      : target.kind === "club"
        ? getGetClubLogoQueryKey(target.id)
        : target.kind === "division"
          ? getGetDivisionLogoQueryKey(target.id)
          : ["presentation-logo-unavailable", target.kind];
  const logoRefreshing =
    useIsFetching({
      queryKey: logoKey,
      predicate: ({ state }) => state.data !== undefined,
    }) > 0;
  const canManage =
    target.kind === "division-creation"
      ? permissions?.manageDivisionLifecycle === true
      : permissions?.manageSportingPresentation === true;
  const canRead =
    canManage ||
    (target.kind === "division" &&
      permissions?.manageDivisionLifecycle === true);
  const editing = usePresentation(target, canRead);
  const presentation =
    sessionStatus === "authenticated" ? editing.query.data : undefined;
  const pending =
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" && account.isPending);
  const title =
    target.kind === "division-creation"
      ? "Créer une division"
      : target.kind === "team"
        ? "Modifier l’équipe"
        : target.kind === "club"
          ? "Modifier le club"
          : target.kind === "pool"
            ? "Modifier la poule"
            : "Personnaliser la division";
  const feedback = useActionFeedback();
  /** Native refresh rereads current presentation and only its mounted remote logo; a prepared local replacement stays untouched. */
  async function refresh() {
    if (editing.save.isPending) return;
    feedback.clear();
    if (!canRead) {
      const result = await account.refetch();
      if (result.isError && presentation) feedback.error();
      return;
    }
    const result = await editing.query.refetch();
    if (result.isError) {
      if (result.data) feedback.error();
      return;
    }
    if (editing.save.isPending) return;
    await client.refetchQueries(
      { queryKey: logoKey, type: "active" },
      { cancelRefetch: false },
    );
    const retainedFailure = client
      .getQueryCache()
      .findAll({ queryKey: logoKey, type: "active" })
      .some(({ state }) => state.status === "error" && state.dataUpdatedAt > 0);
    if (retainedFailure) feedback.error();
  }
  const accessState = pending ? (
    <RequestLoading />
  ) : account.isError ? (
    <ErrorState
      onRetry={() =>
        void account.refetch().then((result) => {
          if (result.isError && result.data) feedback.error();
        })
      }
      retrying={account.isFetching}
    />
  ) : !canRead ? (
    <ErrorState />
  ) : undefined;
  const blockingState = !presentation
    ? (accessState ??
      (editing.query.isError ? (
        <ErrorState
          onRetry={() =>
            void editing.query.refetch().then((result) => {
              if (result.isError && result.data) feedback.error();
            })
          }
          retrying={editing.query.isFetching}
        />
      ) : (
        <RequestLoading />
      )))
    : undefined;
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<PageHeader title={title} />}>
        {({ onScroll, headerHeight }) => (
          <FormScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
            refreshControl={
              !blockingState &&
              sessionStatus === "authenticated" &&
              target.kind !== "division-creation" ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  enabled={!editing.save.isPending}
                  refreshing={
                    editing.query.isRefetching ||
                    account.isRefetching ||
                    logoRefreshing
                  }
                  onRefresh={() => void refresh()}
                />
              ) : undefined
            }
          >
            {blockingState ? (
              <ScreenState>{blockingState}</ScreenState>
            ) : (
              <PageContent>
                {presentation && (
                  <PresentationForm
                    key={`${session.subject}:${target.kind}:${target.id}`}
                    presentation={presentation}
                    target={target}
                    editing={editing}
                    disabled={!canManage || editing.query.isError}
                  />
                )}
              </PageContent>
            )}
          </FormScrollView>
        )}
      </ScrollChrome>
    </Page>
  );
}
