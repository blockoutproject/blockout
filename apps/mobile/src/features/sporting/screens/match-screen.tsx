import { ContributionReportEntry } from "../../contributions/entry";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { PageHeader } from "../../../shared/components/page-header";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import {
  Page,
  PageScrollView,
  PageContent,
} from "../../../shared/components/page";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useState } from "react";
import { AppState } from "react-native";
import { useConsultationQueries } from "../api/use-consultation-queries";

import {
  MatchContributionAction,
  SportingSupportAction,
  useMatchContributionAction,
} from "../components/sporting-actions";
import { tokens } from "../../../shared/theme/tokens";
import { MatchCompactHeader } from "../components/match-compact-header";
import { MatchSummary } from "../components/match-summary";
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
export function MatchScreen({ matchId, focused = true }: MatchScreenProps) {
  const [teamsTop, setTeamsTop] = useState<number>();
  const [presentation, setPresentation] = useState(() => ({
    timeZone: currentSportingTimeZone(),
  }));
  const queries = useConsultationQueries();
  const match = useQuery(queries.match(matchId));
  const { refetch } = match;
  const feedback = useActionFeedback();
  // Effect-owned rereads use the latest feedback owner without making it a request dependency.
  const reread = useEffectEvent(async () => {
    const result = await refetch({ cancelRefetch: false });
    if (result.isError && result.data && !isAccessDenied(result.error))
      feedback.error();
  });
  useEffect(() => {
    if (focused) void reread();
  }, [focused, matchId, refetch]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        // A fresh context also rerenders relative dates when the phone zone is unchanged.
        setPresentation({
          timeZone: currentSportingTimeZone(),
        });
        if (focused) void reread();
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
  if (document && (!focused || !documentAvailable)) setDocument(undefined);
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
    )
      feedback.error();
  }
  const blockingState = !data ? <ReadFeedback query={match} /> : undefined;
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome
        header={(scrollY) =>
          data ? (
            <MatchCompactHeader
              match={data.match}
              scrollY={scrollY}
              teamsTop={teamsTop}
              displayTimeZone={presentation.timeZone}
              action={
                <SportingSupportAction
                  target={{ type: "match", id: matchId }}
                />
              }
            />
          ) : (
            <PageHeader
              action={
                <SportingSupportAction
                  target={{ type: "match", id: matchId }}
                />
              }
            />
          )
        }
      >
        {({ onScroll, headerHeight }) => (
          <PageScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
            refreshControl={
              data ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  refreshing={match.isRefetching || contribution.refreshing}
                  onRefresh={() => void refresh()}
                />
              ) : undefined
            }
          >
            {blockingState ? (
              <ScreenState>{blockingState}</ScreenState>
            ) : (
              <PageContent>
                {data && (
                  <>
                    <MatchSummary
                      match={data.match}
                      onTeamsLayout={({ nativeEvent }) =>
                        setTeamsTop(
                          tokens.layout.content.start + nativeEvent.layout.y,
                        )
                      }
                      displayTimeZone={presentation.timeZone}
                    />
                    <MatchSetScores match={data.match} sets={data.sets} />
                    <MatchLinks
                      detail={data}
                      reportAction={
                        <ContributionReportEntry entry={contribution} />
                      }
                      action={
                        contribution.hasProposals &&
                        !contribution.ownsPublic ? (
                          <MatchContributionAction
                            entry={contribution}
                            header
                          />
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
                                    data.match.pool.classification.division
                                      .color,
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
                      displayTimeZone={presentation.timeZone}
                    />
                  </>
                )}
              </PageContent>
            )}
          </PageScrollView>
        )}
      </ScrollChrome>
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
