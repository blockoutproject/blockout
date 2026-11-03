import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { SourcePreparationLoading } from "../components/collection-loading";
import { ScreenState } from "../../../shared/components/screen-state";
import { ReadFeedback } from "../../../shared/components/read-feedback";

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
  /** Refreshes the admitted source and season together; one event reports their retained-draft failure. */
  async function refresh() {
    if (editing.candidate.isPending) return;
    feedback.clear();
    const results = await Promise.all(
      !authority.enabled
        ? [authority.account.refetch({ cancelRefetch: false })]
        : [
            source.refetch({ cancelRefetch: false }),
            season.refetch({ cancelRefetch: false }),
          ],
    );
    if (retained && results.some((result) => result.isError)) feedback.error();
  }
  const pending =
    !retained &&
    (!authority.enabled
      ? authority.sessionStatus === "restoring" ||
        (authority.sessionStatus === "authenticated" &&
          authority.account.isLoading)
      : !source.isError &&
        !season.isError &&
        (source.isLoading || season.isLoading) &&
        !(current && current.seasonId !== seasonId));
  const FeedbackLayout = pending ? PageContent : ScreenState;
  const blockingState = !retained ? (
    !authority.enabled ? (
      <AccessFeedback
        {...authority}
        loadingContent={<SourcePreparationLoading />}
      />
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
      <ReadFeedback
        query={!season.data ? season : source}
        loadingContent={<SourcePreparationLoading />}
      />
    )
  ) : undefined;
  return (
    <Page header={<PageHeader title={current?.label ?? "Source"} />}>
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
              onRefresh={() => void refresh()}
            />
          ) : undefined
        }
      >
        {blockingState ? (
          <FeedbackLayout>{blockingState}</FeedbackLayout>
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
