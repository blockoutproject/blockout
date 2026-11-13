import { useActionFeedback } from "@/shared/components/action-feedback";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { CloseSeasonLoading } from "../components/collection-loading";
import { ScreenState } from "@/shared/components/screen-state";
import { ReadFeedback } from "@/shared/components/read-feedback";

import { ErrorState } from "@/shared/components/state-card";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { useCloseCollectionSeason } from "../api/use-collection-controls";
import { CloseSeasonForm } from "../forms/close-season-form";

/** An ordinary route retains the exact typed season label through refusals and temporary admission removal. */
export function CloseSeasonScreen({
  seasonId,
}: Readonly<{ seasonId: string }>) {
  const editing = useCloseCollectionSeason(seasonId);
  const { authority, season } = editing;
  const feedback = useActionFeedback();
  const pending =
    !season.data &&
    (!authority.enabled
      ? authority.sessionStatus === "restoring" ||
        (authority.sessionStatus === "authenticated" &&
          authority.account.isLoading)
      : season.isLoading);
  const FeedbackLayout = pending ? PageContent : ScreenState;

  /** Keeps closure drafts mounted while absent season data resolves admission and read feedback. */
  function renderBlockingState() {
    if (!season.data) {
      if (!authority.enabled) {
        return (
          <AccessFeedback
            {...authority}
            loadingContent={<CloseSeasonLoading />}
          />
        );
      }
      if (season.isError) {
        return (
          <ErrorState
            onRetry={() =>
              void season.refetch().then((result) => {
                if (result.isError && result.data) {
                  feedback.error();
                }
              })
            }
            retrying={season.isFetching}
          />
        );
      }
      return (
        <ReadFeedback query={season} loadingContent={<CloseSeasonLoading />} />
      );
    }
    return undefined;
  }

  const blockingState = renderBlockingState();

  /** Rereads the current authority or season without replaying closure or replacing the retained draft. */
  async function refresh() {
    if (editing.close.isPending) {
      return;
    }
    const result = await (!authority.enabled
      ? authority.account.refetch({ cancelRefetch: false })
      : season.refetch({ cancelRefetch: false }));
    if (result.isError && result.data) {
      feedback.error();
    }
  }

  return (
    <Page header={<PageHeader title={"Clôturer la saison"} />}>
      <FormScrollView
        refreshControl={
          authority.sessionStatus === "authenticated" && !blockingState ? (
            <DataRefreshControl
              enabled={!editing.close.isPending}
              onRefresh={refresh}
            />
          ) : undefined
        }
      >
        {blockingState ? (
          <FeedbackLayout>{blockingState}</FeedbackLayout>
        ) : (
          <PageContent>
            {season.data && (
              <CloseSeasonForm
                key={`${authority.session.subject}/${seasonId}`}
                season={season.data}
                editing={editing}
              />
            )}
          </PageContent>
        )}
      </FormScrollView>
    </Page>
  );
}
