import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { ErrorState } from "../../../shared/components/state-card";
import {
  MatchSummary,
  useConsultationQueries,
} from "../../sporting/match-consultation";
import { useOwnContributions } from "../api/own-contributions";
import { ContributionForm } from "../forms/contribution-form";

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
    if (editing.submit.isPending) return;
    feedback.clear();
    const results = await Promise.allSettled([
      editing.refresh(),
      match.refetch({ throwOnError: true }),
    ]);
    if (results.some((result) => result.status === "rejected"))
      feedback.error();
  }
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<PageHeader title="Lien de diffusion" />}>
        {({ onScroll, headerHeight }) => (
          <FormScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
            refreshControl={
              authenticated && editing.usable && current ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  enabled={!editing.submit.isPending}
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
                {editing.session.status === "restoring" ||
                editing.session.operation ? (
                  <RequestLoading />
                ) : (
                  <Button
                    label="Se connecter"
                    onPress={() => router.push("/sign-in")}
                  />
                )}
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
                {match.data && (
                  <MatchSummary
                    match={match.data.match}
                    presentation="context"
                  />
                )}
                {editing.profile.isError && (
                  <Button
                    label="Réessayer le profil"
                    loading={editing.profile.isFetching}
                    onPress={() => void editing.profile.refetch()}
                  />
                )}
                <ContributionForm
                  key={`${editing.session.subject}:${editing.session.accountId}:${matchId}`}
                  matchId={matchId}
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
