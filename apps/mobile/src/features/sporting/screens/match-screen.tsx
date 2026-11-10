import { SportingMatchLoading } from "../components/sporting-loading";
import { ContributionReportEntry } from "../../contributions/entry";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { PageHeader } from "../../../shared/components/page-header";
import {
  Page,
  PageScrollView,
  PageContent,
} from "../../../shared/components/page";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useConsultationQueries } from "../api/use-consultation-queries";

import {
  MatchContributionAction,
  SportingSupportAction,
  useMatchContributionAction,
} from "../components/sporting-actions";
import { MatchSummary } from "../components/match-summary";
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
  /** Keeps initial read feedback separate from the accepted match content and its actions. */
  function renderMatchContent() {
    if (blockingState) {
      if (match.isPending) {
        return <PageContent>{blockingState}</PageContent>;
      }
      return <ScreenState>{blockingState}</ScreenState>;
    }
    return (
      <PageContent>
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
                  <MatchContributionAction entry={contribution} header />
                ) : undefined
              }
              primaryAction={
                contribution.publicOwnershipUnknown ||
                contribution.ownsPublic ||
                (!data.streamUrl && contribution.canPropose) ? (
                  <MatchContributionAction
                    entry={contribution}
                    contextColor={
                      data.match.pool.classification.division?.color
                    }
                    contextGradient={
                      data.match.pool.classification.division?.gradient
                    }
                    contextForeground={
                      data.match.pool.classification.division
                        ? divisionTextColor(
                            data.match.pool.classification.division.color,
                          )
                        : undefined
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
      </PageContent>
    );
  }

  const [displayTimeZone, setDisplayTimeZone] = useState(
    currentSportingTimeZone,
  );
  const queries = useConsultationQueries();
  const match = useQuery(queries.match(matchId));
  const { refetch } = match;
  const feedback = useActionFeedback();
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

  /** A failed explicit refresh keeps authorized content and reports only the attempted read. */
  async function refresh() {
    feedback.clear();
    const [result, entryResult] = await Promise.all([
      match.refetch({ cancelRefetch: false }),
      contribution.refresh(),
    ]);
    if (
      (result.isError && result.data && !isAccessDenied(result.error)) ||
      (entryResult?.isError && !isAccessDenied(entryResult.error))
    ) {
      feedback.error();
    }
  }

  const blockingState = !data ? (
    <ReadFeedback query={match} loadingContent={<SportingMatchLoading />} />
  ) : undefined;
  return (
    <Page
      header={
        data ? (
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
      <PageScrollView
        refreshControl={
          data ? <DataRefreshControl onRefresh={refresh} /> : undefined
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
