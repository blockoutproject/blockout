import { AccessFeedback } from "../../access/components/access-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { PageHeader } from "../../../shared/components/page-header";
import { Page, PageContent } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { useCloseCollectionSeason } from "../api/use-collection-controls";

import { CloseSeasonForm } from "../forms/close-season-form";

/** An ordinary route retains the exact typed season label through refusals and temporary admission removal. */
export function CloseSeasonScreen({ seasonId }: { seasonId: string }) {
  const editing = useCloseCollectionSeason(seasonId);
  const { authority, season } = editing;
  const feedback = useActionFeedback();
  const blockingState = !season.data ? (
    !authority.enabled ? (
      <AccessFeedback {...authority} />
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
      <RequestLoading />
    )
  ) : undefined;
  return (
    <Page>
      <PageHeader title={"Clôturer la saison"} />
      <FormScrollView
        refreshControl={
          authority.sessionStatus === "authenticated" ? (
            <DataRefreshControl
              refreshing={season.isRefetching || authority.account.isRefetching}
              enabled={!editing.close.pending}
              onRefresh={() => {
                if (editing.close.isPending()) return;
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
          <ScreenState>{blockingState}</ScreenState>
        ) : (
          <PageContent>
            {season.data && (
              <CloseSeasonForm
                key={`${authority.session.generation}/${seasonId}`}
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
