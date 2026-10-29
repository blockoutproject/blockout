import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { AccessFeedback } from "../../access/components/access-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { PageHeader } from "../../../shared/components/page-header";
import { Page, PageContent } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { RequestLoading } from "../../../shared/components/request-feedback";
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
  const blockingState = !(current && sources.data) ? (
    !authority.enabled ? (
      <AccessFeedback {...authority} />
    ) : season.isError || sources.isError ? (
      <ErrorState
        onRetry={() => {
          void season.refetch();
          void sources.refetch();
        }}
        retrying={season.isFetching || sources.isFetching}
      />
    ) : (
      <RequestLoading />
    )
  ) : undefined;
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome
        header={<PageHeader title={provider === "lnv" ? "LNV" : "FFVB"} />}
      >
        {({ onScroll, headerHeight }) => (
          <FormScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
            refreshControl={
              authority.sessionStatus === "authenticated" && !blockingState ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  refreshing={
                    season.isRefetching ||
                    sources.isRefetching ||
                    authority.account.isRefetching
                  }
                  enabled={!editing.create.pending}
                  onRefresh={() => {
                    if (editing.create.isPending()) return;
                    if (!authority.enabled)
                      void authority.account
                        .refetch({ cancelRefetch: false })
                        .then((result) => {
                          if (result.isError && retained) feedback.error();
                        });
                    else {
                      void season
                        .refetch({ cancelRefetch: false })
                        .then((result) => {
                          if (result.isError && retained) feedback.error();
                        });
                      void sources
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
                {current && sources.data && (
                  <ProviderPreparationForm
                    key={`${authority.session.generation}:${seasonId}:${provider}`}
                    season={current}
                    provider={provider}
                    editing={editing}
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
