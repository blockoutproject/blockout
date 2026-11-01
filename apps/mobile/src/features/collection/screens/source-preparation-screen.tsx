import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";

import { ErrorState } from "../../../shared/components/state-card";
import { AccessFeedback } from "../../access/components/access-feedback";
import { useSourcePreparation } from "../api/use-source-preparation";
import { SourceCandidateForm } from "../forms/source-candidate-form";

/** Original source route inputs; its retained form owns draft-discard confirmation. */
export interface SourcePreparationScreenProps {
  seasonId: string;
  sourceId: string;
}
/** Retains a source draft read-only on grant/read failure; identity changes discard the obsolete editor. */
export function SourcePreparationScreen({
  seasonId,
  sourceId,
}: SourcePreparationScreenProps) {
  const editing = useSourcePreparation(seasonId, sourceId);
  const { authority, source, season } = editing;
  const current =
    authority.sessionStatus === "authenticated" ? source.data : undefined;
  const retained = Boolean(
    current && season.data && current.seasonId === seasonId,
  );
  const feedback = useActionFeedback();
  const blockingState = !retained ? (
    !authority.enabled ? (
      <AccessFeedback {...authority} />
    ) : source.isError ||
      season.isError ||
      (current && current.seasonId !== seasonId) ? (
      <ErrorState
        onRetry={() => {
          void source.refetch();
          void season.refetch();
        }}
        retrying={source.isFetching || season.isFetching}
      />
    ) : (
      <RequestLoading />
    )
  ) : undefined;
  return (
    <Page>
      <PageHeader title={current?.label ?? "Source"} />
      <FormScrollView
        refreshControl={
          authority.sessionStatus === "authenticated" && !blockingState ? (
            <DataRefreshControl
              refreshing={
                source.isRefetching ||
                season.isRefetching ||
                authority.account.isRefetching
              }
              enabled={!editing.candidate.isPending}
              onRefresh={() => {
                if (editing.candidate.isPending) return;
                if (!authority.enabled)
                  void authority.account
                    .refetch({ cancelRefetch: false })
                    .then((result) => {
                      if (result.isError && retained) feedback.error();
                    });
                else {
                  void source
                    .refetch({ cancelRefetch: false })
                    .then((result) => {
                      if (result.isError && retained) feedback.error();
                    });
                  void season
                    .refetch({ cancelRefetch: false })
                    .then((result) => {
                      if (result.isError && retained) feedback.error();
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
            {current && season.data && current.seasonId === seasonId && (
              <SourceCandidateForm
                key={`${authority.session.subject}:${sourceId}`}
                source={current}
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
