import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { CloseSeasonLoading } from "../components/collection-loading";
import { ScreenState } from "../../../shared/components/screen-state";
import { ReadFeedback } from "../../../shared/components/read-feedback";

import { ErrorState } from "../../../shared/components/state-card";
import { AccessFeedback } from "../../access/components/access-feedback";
import { useCloseCollectionSeason } from "../api/use-collection-controls";
import { CloseSeasonForm } from "../forms/close-season-form";

/** An ordinary route retains the exact typed season label through refusals and temporary admission removal. */
export function CloseSeasonScreen({ seasonId }: { seasonId: string }) {
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
  const blockingState = !season.data ? (
    !authority.enabled ? (
      <AccessFeedback {...authority} loadingContent={<CloseSeasonLoading />} />
    ) : season.isError ? (
      <ErrorState
        onRetry={() =>
          void season.refetch().then((result) => {
            if (result.isError && result.data) feedback.error();
          })
        }
        retrying={season.isFetching}
      />
    ) : (
      <ReadFeedback query={season} loadingContent={<CloseSeasonLoading />} />
    )
  ) : undefined;
  return (
    <Page header={<PageHeader title={"Clôturer la saison"} />}>
      <FormScrollView
        refreshControl={
          authority.sessionStatus === "authenticated" && !blockingState ? (
            <DataRefreshControl
              refreshing={season.isRefetching || authority.account.isRefetching}
              enabled={!editing.close.isPending}
              onRefresh={() => {
                if (editing.close.isPending) return;
                if (!authority.enabled)
                  void authority.account
                    .refetch({ cancelRefetch: false })
                    .then((result) => {
                      if (result.isError && result.data) feedback.error();
                    });
                else {
                  void season
                    .refetch({ cancelRefetch: false })
                    .then((result) => {
                      if (result.isError && result.data) feedback.error();
                    });
                }
              }}
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
