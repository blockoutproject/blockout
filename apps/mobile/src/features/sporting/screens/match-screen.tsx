import {
  ContributionEntry,
  ContributionReportEntry,
  useContributionEntry,
} from "@/features/contributions/entry";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { PageHeader } from "@/shared/components/page-header";
import { NavigationAccent } from "@/shared/components/navigation-accent";
import { Page, PageScrollView, PageContent } from "@/shared/components/page";
import {
  SectionContentReveal,
  useSectionContentReveal,
} from "@/shared/components/section-content-reveal";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useConsultationQueries } from "../api/use-consultation-queries";

import { SportingSupportAction } from "../components/sporting-actions";
import { MatchSummary, MatchSummaryLoading } from "../components/match-summary";
import { MatchPageHeader } from "../components/match-page-header";
import { MatchSetScores } from "../components/match-set-scores";
import { MatchInformation } from "../components/match-information";
import type { MatchDocumentKindEnum } from "../../../../.generated/schemas/index.zod";
import { MatchDocumentReader } from "../components/match-document-reader";
import { MatchLinks } from "../components/match-links";
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
  /** A required Match or public-link ownership failure replaces its dependent summary and actions. */
  function renderMatchContent() {
    if (blockingState) {
      if (!failed && match.isPending) {
        return <PageContent>{blockingState}</PageContent>;
      }
      return <ScreenState>{blockingState}</ScreenState>;
    }
    return (
      <SectionContentReveal reveal={reveal}>
        {data && (
          <>
            <MatchSummary
              match={data.match}
              displayTimeZone={displayTimeZone}
            />
            <MatchSetScores match={data.match} sets={data.sets} />
            <MatchLinks
              detail={data}
              reportAction={<ContributionReportEntry entry={contribution} />}
              action={
                contribution.hasProposals && !contribution.ownsPublic ? (
                  <ContributionEntry entry={contribution} header />
                ) : undefined
              }
              primaryAction={
                contribution.publicOwnershipUnknown ||
                contribution.ownsPublic ||
                (!data.streamUrl && contribution.canPropose) ? (
                  <ContributionEntry
                    entry={contribution}
                    contextColor={division?.color}
                    contextGradient={division?.gradient}
                    contextForeground={
                      division ? divisionTextColor(division.color) : undefined
                    }
                  />
                ) : undefined
              }
            />
            <MatchInformation
              onDocumentOpen={(kind) => setDocument({ matchId, kind })}
              detail={data}
              displayTimeZone={displayTimeZone}
            />
          </>
        )}
      </SectionContentReveal>
    );
  }

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
  const contribution = useContributionEntry(
    matchId,
    !!data,
    data?.streamUrl ? data.streamContributionId : undefined,
    data?.streamUrl,
  );
  const { personalRead } = contribution;

  /** Refreshes ordinary Match and contribution-owner reads without attributing read failures to an action toast. */
  async function refresh() {
    await Promise.all([
      match.refetch({ cancelRefetch: false }),
      personalRead?.refetch({ cancelRefetch: false }),
    ]);
  }

  const matchFailed = hasReadError(match);
  const ownershipFailed =
    contribution.publicOwnershipUnknown &&
    !!personalRead &&
    hasReadError(personalRead);
  const failed = matchFailed || ownershipFailed;
  const blockingState =
    matchFailed || !data ? (
      <ReadFeedback
        key={matchId}
        query={match}
        loadingContent={<MatchSummaryLoading />}
      />
    ) : ownershipFailed ? (
      <ReadFeedback
        key={`${matchId}:ownership`}
        query={personalRead}
        onRetry={() => personalRead.refetch({ cancelRefetch: false })}
        loadingContent={null}
      />
    ) : undefined;
  const reveal = useSectionContentReveal(focused && !!data && !blockingState);
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
            titleAlignment="center"
            action={
              <SportingSupportAction target={{ type: "match", id: matchId }} />
            }
          />
        )
      }
    >
      <NavigationAccent color={failed ? undefined : division?.color} />
      <PageScrollView
        onLayout={reveal.onViewportLayout}
        refreshControl={
          data && !failed ? (
            <DataRefreshControl
              onRefresh={refresh}
              fetching={match.isFetching || !!personalRead?.isFetching}
            />
          ) : undefined
        }
      >
        {renderMatchContent()}
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
