import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useOwnContributions } from "../api/own-contributions";
import { ContributionForm } from "../forms/contribution-form";
import {
  useConsultationQueries,
  MatchSummary,
} from "../../sporting/match-consultation";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { ScreenState } from "../../../shared/components/screen-state";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Button } from "../../../shared/components/button";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ErrorState } from "../../../shared/components/state-card";
import { useActionFeedback } from "../../../shared/components/action-feedback";

/** Exact match route; F05/F12 and the generated owner read retain authority over submission. */
export interface ContributionScreenProps {
  matchId: string;
}
/** Composes native scrolling and retained RHF content without a second session, cache or form shell. */
export function ContributionScreen({ matchId }: ContributionScreenProps) {
  const editing = useOwnContributions(matchId);
  const match = useQuery(useConsultationQueries().match(matchId));
  const router = useRouter();
  const feedback = useActionFeedback();
  const current = editing.query.data?.pages[0];
  const guest = editing.session.status === "guest";
  const authenticated = editing.session.status === "authenticated";
  /** Pull-to-refresh observes displayed reads only; it cannot release command uncertainty. */
  async function refresh() {
    if (editing.submit.isPending()) return;
    feedback.clear();
    const results = await Promise.all([editing.refresh(), match.refetch()]);
    if (
      editing.session.isCurrent(editing.session.generation) &&
      results.some((result) => result?.isError && result.data)
    )
      feedback.error();
  }
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<PageHeader title="Stream link" />}>
        {({ onScroll, headerHeight }) => (
          <FormScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
            refreshControl={
              authenticated && editing.usable ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  enabled={!editing.submit.pending}
                  refreshing={editing.query.isRefetching || match.isRefetching}
                  onRefresh={() => void refresh()}
                />
              ) : undefined
            }
          >
            {guest ? (
              <ScreenState>
                <Button
                  label="Se connecter"
                  onPress={() =>
                    router.push({
                      pathname: "/sign-in-invitation",
                      params: { reason: "contribution" },
                    })
                  }
                />
              </ScreenState>
            ) : !authenticated ? (
              <ScreenState>
                <RequestLoading />
              </ScreenState>
            ) : !editing.profile.data ? (
              <ScreenState>
                <ReadFeedback query={editing.profile} />
              </ScreenState>
            ) : !editing.usable && !current ? (
              <ScreenState>
                <ErrorState
                  onRetry={() => void editing.profile.refetch()}
                  retrying={editing.profile.isFetching}
                />
              </ScreenState>
            ) : !current ? (
              <ScreenState>
                <ReadFeedback query={editing.query} />
              </ScreenState>
            ) : (
              <PageContent>
                {match.data && <MatchSummary match={match.data.match} />}
                {editing.profile.isError && (
                  <Button
                    label="Réessayer le profil"
                    loading={editing.profile.isFetching}
                    onPress={() => void editing.profile.refetch()}
                  />
                )}
                <ContributionForm
                  key={`${editing.session.generation}:${editing.session.accountId}:${matchId}`}
                  current={current}
                  editing={editing}
                />
              </PageContent>
            )}
          </FormScrollView>
        )}
      </ScrollChrome>
    </Page>
  );
}
