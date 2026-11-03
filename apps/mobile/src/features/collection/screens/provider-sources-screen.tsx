import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ProviderPreparationLoading } from "../components/collection-loading";
import { ScreenState } from "../../../shared/components/screen-state";

import { ErrorState } from "../../../shared/components/state-card";
import { AccessFeedback } from "../../access/components/access-feedback";
import { useSeasonPreparation } from "../api/use-source-preparation";
import { ProviderPreparationForm } from "../forms/provider-preparation-form";

/** Selects the season/provider whose current reads admit the retained preparation form. */
export interface ProviderSourcesScreenProps {
  seasonId: string;
  provider: CollectionProviderEnum;
}
/** Lists missing/discovered source coverage and launches only explicitly selected qualified bindings. */
export function ProviderSourcesScreen({
  seasonId,
  provider,
}: ProviderSourcesScreenProps) {
  const editing = useSeasonPreparation(seasonId);
  const { authority, season, sources } = editing;
  const current =
    authority.sessionStatus === "authenticated" ? season.data : undefined;
  const retained = Boolean(current && sources.data);
  const feedback = useActionFeedback();
  /** Refreshes this provider's season and source catalogue together, reporting one retained-draft failure. */
  async function refresh() {
    if (editing.create.isPending) return;
    feedback.clear();
    const results = await Promise.all(
      !authority.enabled
        ? [authority.account.refetch({ cancelRefetch: false })]
        : [
            season.refetch({ cancelRefetch: false }),
            sources.refetch({ cancelRefetch: false }),
          ],
    );
    if (retained && results.some((result) => result.isError)) feedback.error();
  }
  const pending =
    !retained &&
    (!authority.enabled
      ? authority.sessionStatus === "restoring" ||
        (authority.sessionStatus === "authenticated" &&
          authority.account.isPending)
      : !season.isError && !sources.isError);
  const FeedbackLayout = pending ? PageContent : ScreenState;
  const blockingState = !retained ? (
    !authority.enabled ? (
      <AccessFeedback
        {...authority}
        loadingContent={<ProviderPreparationLoading />}
      />
    ) : season.isError || sources.isError ? (
      <ErrorState
        onRetry={() => {
          void season.refetch();
          void sources.refetch();
        }}
        retrying={season.isFetching || sources.isFetching}
      />
    ) : (
      <ProviderPreparationLoading />
    )
  ) : undefined;
  return (
    <Page header={<PageHeader title={provider === "lnv" ? "LNV" : "FFVB"} />}>
      <FormScrollView
        refreshControl={
          authority.sessionStatus === "authenticated" && !blockingState ? (
            <DataRefreshControl
              refreshing={
                season.isRefetching ||
                sources.isRefetching ||
                authority.account.isRefetching
              }
              enabled={!editing.create.isPending}
              onRefresh={() => void refresh()}
            />
          ) : undefined
        }
      >
        {blockingState ? (
          <FeedbackLayout>{blockingState}</FeedbackLayout>
        ) : (
          <PageContent>
            {current && sources.data && (
              <ProviderPreparationForm
                key={`${authority.session.subject}:${seasonId}:${provider}`}
                season={current}
                provider={provider}
                editing={editing}
              />
            )}
          </PageContent>
        )}
      </FormScrollView>
    </Page>
  );
}
