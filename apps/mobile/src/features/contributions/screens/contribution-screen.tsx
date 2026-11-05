import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ContributionFormLoading } from "../components/contribution-loading";
import { ScreenState } from "../../../shared/components/screen-state";

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

  /** Rereads displayed context and proposals while a pending submission disables the gesture. */
  async function refresh() {
    if (editing.submit.isPending) {
      return;
    }
    feedback.clear();
    const results = await Promise.allSettled([
      editing.refresh(),
      match.refetch({ throwOnError: true }),
    ]);
    if (results.some((result) => result.status === "rejected")) {
      feedback.error();
    }
  }

  const pending =
    !guest &&
    (!authenticated
      ? editing.session.status === "restoring" || !!editing.session.operation
      : !editing.profile.data
        ? editing.profile.isLoading
        : editing.usable && !current && editing.query.isLoading);
  const FeedbackLayout = pending ? PageContent : ScreenState;
  return (
    <Page header={<PageHeader title="Lien de diffusion" />}>
      <FormScrollView
        refreshControl={
          authenticated && editing.usable && current ? (
            <DataRefreshControl
              enabled={!editing.submit.isPending}
              onRefresh={refresh}
            />
          ) : undefined
        }
      >
        {guest ? (
          <FeedbackLayout style={styles.centered}>
            <Button
              label="Se connecter"
              onPress={() =>
                router.push({
                  pathname: "/sign-in-invitation",
                  params: { reason: "contribution" },
                })
              }
            />
          </FeedbackLayout>
        ) : !authenticated ? (
          <FeedbackLayout style={pending ? undefined : styles.centered}>
            {editing.session.status === "restoring" ||
            editing.session.operation ? (
              <ContributionFormLoading />
            ) : (
              <Button
                label="Se connecter"
                onPress={() => router.push("/sign-in")}
              />
            )}
          </FeedbackLayout>
        ) : !editing.profile.data ? (
          <FeedbackLayout>
            <ReadFeedback
              query={editing.profile}
              loadingContent={<ContributionFormLoading />}
            />
          </FeedbackLayout>
        ) : !editing.usable && !current ? (
          <FeedbackLayout>
            <ErrorState
              onRetry={() => void editing.profile.refetch()}
              retrying={editing.profile.isFetching}
            />
          </FeedbackLayout>
        ) : !current ? (
          <FeedbackLayout>
            <ReadFeedback
              query={editing.query}
              loadingContent={<ContributionFormLoading />}
            />
          </FeedbackLayout>
        ) : (
          <PageContent>
            {match.data && (
              <MatchSummary match={match.data.match} presentation="context" />
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
    </Page>
  );
}

const styles = StyleSheet.create({ centered: { justifyContent: "center" } });
