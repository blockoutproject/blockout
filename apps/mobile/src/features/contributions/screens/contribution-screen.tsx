import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { Button } from "@/shared/components/button";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ContributionFormLoading } from "../components/contribution-loading";
import { ScreenState } from "@/shared/components/screen-state";

import {
  MatchSummary,
  useConsultationQueries,
} from "@/features/sporting/match-consultation";
import { AccountSessionFeedback } from "@/features/accounts/current-account";
import { useOwnContributions } from "../api/own-contributions";
import { ContributionForm } from "../forms/contribution-form";

/** Exact match route; F05/F12 and the generated owner read retain authority over submission. */
export interface ContributionScreenProps {
  matchId: string;
}

/** Keeps native refresh ancestry and the original RHF owner stable while required reads recover. */
export function ContributionScreen({
  matchId,
}: Readonly<ContributionScreenProps>) {
  const editing = useOwnContributions(matchId);
  const match = useQuery(useConsultationQueries().match(matchId));
  const router = useRouter();
  const current = editing.query.data?.pages[0];
  const guest = editing.session.status === "guest";
  const authenticated = editing.session.status === "authenticated";

  const requiredRead = !editing.usable
    ? editing.profile
    : ([editing.profile, match, editing.query].find(hasReadError) ??
      (!match.data ? match : editing.query));
  const blocked = !authenticated || !editing.usable || !current || !match.data;
  const pending = !authenticated
    ? editing.session.status === "restoring" || !!editing.session.operation
    : !hasReadError(requiredRead) && requiredRead.isLoading;
  const readFailed = hasReadError(requiredRead);
  const FeedbackLayout = pending || !blocked ? PageContent : ScreenState;

  function refresh() {
    return Promise.allSettled([
      editing.refresh(),
      match.refetch({ cancelRefetch: false }),
    ]);
  }

  return (
    <Page header={<PageHeader title="Lien de diffusion" />}>
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            fetching={editing.query.isFetching || match.isFetching}
            enabled={!blocked && !readFailed && !editing.submit.isPending}
            onRefresh={refresh}
          />
        }
      >
        {(blocked || readFailed) && (
          <FeedbackLayout style={guest ? styles.centered : undefined}>
            {guest ? (
              <Button
                label="Se connecter"
                onPress={() =>
                  router.push({
                    pathname: "/sign-in-invitation",
                    params: { reason: "contribution" },
                  })
                }
              />
            ) : !authenticated ? (
              <AccountSessionFeedback
                loadingContent={<ContributionFormLoading />}
              />
            ) : (
              <ReadFeedback
                failed={!editing.usable && !editing.profile.isPending}
                query={requiredRead}
                loadingContent={<ContributionFormLoading />}
                onRetry={requiredRead === editing.profile ? undefined : refresh}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent style={blocked ? styles.hidden : undefined}>
          {match.data && !hasReadError(match) && (
            <MatchSummary match={match.data.match} presentation="context" />
          )}
          {current && (
            <ContributionForm
              key={`${editing.session.subject}:${editing.session.accountId}:${matchId}`}
              matchId={matchId}
              current={current}
              editing={editing}
            />
          )}
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: "center" },
  hidden: { display: "none" },
});
