import { ContributionReportEntry } from "@/features/contributions/entry";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { PageHeader } from "@/shared/components/page-header";
import { NavigationAccent } from "@/shared/components/navigation-accent";
import { Page, PageScrollView, PageContent } from "@/shared/components/page";
import { useInitialContentReveal } from "@/shared/components/initial-content-reveal";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useConsultationQueries } from "../api/use-consultation-queries";

import {
  MatchContributionAction,
  SportingSupportAction,
  useMatchContributionAction,
} from "../components/sporting-actions";
import { MatchSummary, MatchSummaryLoading } from "../components/match-summary";
import { MatchPageHeader } from "../components/match-page-header";
import {
  hasMatchSetScores,
  MatchSetScores,
} from "../components/match-set-scores";
import { MatchInformation } from "../components/match-information";
import type {
  MatchDetailResponse,
  MatchDocumentKindEnum,
} from "../../../../.generated/schemas/index.zod";
import { MatchDocumentReader } from "../components/match-document-reader";
import { matchLinksContent, MatchLinks } from "../components/match-links";
import { divisionTextColor } from "../presentation";
import { currentSportingTimeZone } from "../model/sporting-time";

/** Exact dated public match identity; contextual actions remain with their feature owners. */
export interface MatchScreenProps {
  matchId: string;
  /** The route supplies native focus; standalone compositions are focused by default. */
  focused?: boolean;
}

/** Presents accepted facts and rereads only this match on route focus and foreground return. */
export function MatchScreen({
  matchId,
  focused = true,
}: Readonly<MatchScreenProps>) {
  const [displayTimeZone, setDisplayTimeZone] = useState(
    currentSportingTimeZone,
  );
  const queries = useConsultationQueries();
  const match = useQuery(queries.match(matchId));
  const { refetch } = match;
  // Focus/foreground rereads retain Query state without publishing action feedback.
  useEffect(() => {
    if (focused) {
      void refetch({ cancelRefetch: false });
    }
  }, [focused, matchId, refetch]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setDisplayTimeZone(currentSportingTimeZone());
        if (focused) {
          void refetch({ cancelRefetch: false });
        }
      }
    });
    return () => subscription.remove();
  }, [focused, matchId, refetch]);
  const data = match.data;
  const division = data?.match.pool.classification.division;
  const [document, setDocument] = useState<{
    matchId: string;
    kind: MatchDocumentKindEnum;
  }>();
  const documentAvailable =
    document?.matchId === matchId &&
    !!data?.documents.some((item) => item.kind === document.kind);
  // Retire a local opening when its resource/context disappears; a later recovery never reopens it.
  if (document && (!focused || !documentAvailable)) {
    setDocument(undefined);
  }
  const contribution = useMatchContributionAction(
    matchId,
    !!data,
    data?.streamUrl ? data.streamContributionId : undefined,
    data?.streamUrl,
  );

  /** Refreshes ordinary Match and contribution-owner reads without attributing read failures to an action toast. */
  async function refresh() {
    await Promise.all([
      match.refetch({ cancelRefetch: false }),
      contribution.refresh(),
    ]);
  }

  const ownership = contribution.publicOwnershipUnknown
    ? contribution.ownershipRead
    : undefined;
  const failed =
    hasReadError(match) || (!!ownership && hasReadError(ownership));
  const blockingState =
    hasReadError(match) || !data ? (
      <ReadFeedback
        key={matchId}
        query={match}
        loadingContent={<MatchSummaryLoading />}
      />
    ) : ownership && hasReadError(ownership) ? (
      <ReadFeedback
        key={`${matchId}:ownership`}
        query={ownership}
        onRetry={() => ownership.refetch({ cancelRefetch: false })}
        loadingContent={null}
      />
    ) : undefined;
  return (
    <Page
      canvasTint={failed ? undefined : division?.color}
      header={
        data && !failed ? (
          <MatchPageHeader
            match={data.match}
            action={
              <SportingSupportAction target={{ type: "match", id: matchId }} />
            }
          />
        ) : (
          <PageHeader
            title="Le match"
            action={
              <SportingSupportAction target={{ type: "match", id: matchId }} />
            }
          />
        )
      }
    >
      <NavigationAccent color={failed ? undefined : division?.color} />
      <PageScrollView
        refreshControl={
          data && !failed ? (
            <DataRefreshControl
              onRefresh={refresh}
              fetching={
                match.isFetching || !!contribution.ownershipRead?.isFetching
              }
            />
          ) : undefined
        }
      >
        {blockingState ? (
          !failed && match.isPending ? (
            <PageContent>{blockingState}</PageContent>
          ) : (
            <ScreenState>{blockingState}</ScreenState>
          )
        ) : data ? (
          <MatchContent
            detail={data}
            displayTimeZone={displayTimeZone}
            contribution={contribution}
            onDocumentOpen={(kind) => setDocument({ matchId, kind })}
          />
        ) : null}
      </PageScrollView>
      {focused && documentAvailable && document && (
        <MatchDocumentReader
          key={`${matchId}:${document.kind}`}
          matchId={matchId}
          kind={document.kind}
          onClose={() => setDocument(undefined)}
        />
      )}
    </Page>
  );
}

function MatchContent({
  detail,
  displayTimeZone,
  contribution,
  onDocumentOpen,
}: Readonly<{
  detail: MatchDetailResponse;
  displayTimeZone: string;
  contribution: ReturnType<typeof useMatchContributionAction>;
  onDocumentOpen(kind: MatchDocumentKindEnum): void;
}>) {
  useInitialContentReveal(true);
  const division = detail.match.pool.classification.division;
  const action = contribution.hasProposals && !contribution.ownsPublic && (
    <MatchContributionAction entry={contribution} header />
  );
  const primaryAction = (contribution.publicOwnershipUnknown ||
    contribution.ownsPublic ||
    (!detail.streamUrl && contribution.canPropose)) && (
    <MatchContributionAction
      entry={contribution}
      contextColor={division?.color}
      contextGradient={division?.gradient}
      contextForeground={
        division ? divisionTextColor(division.color) : undefined
      }
    />
  );
  const linksIndex = hasMatchSetScores(detail.match, detail.sets) ? 2 : 1;
  const hasLinks = Boolean(
    matchLinksContent(detail.streamUrl, action, primaryAction),
  );

  return (
    <PageContent>
      <MatchSummary
        match={detail.match}
        displayTimeZone={displayTimeZone}
        revealIndex={0}
      />
      <MatchSetScores match={detail.match} sets={detail.sets} revealIndex={1} />
      <MatchLinks
        detail={detail}
        reportAction={<ContributionReportEntry entry={contribution} />}
        action={action || undefined}
        primaryAction={primaryAction || undefined}
        revealIndex={linksIndex}
      />
      <MatchInformation
        onDocumentOpen={onDocumentOpen}
        detail={detail}
        displayTimeZone={displayTimeZone}
        revealIndex={linksIndex + (hasLinks ? 1 : 0)}
      />
    </PageContent>
  );
}
