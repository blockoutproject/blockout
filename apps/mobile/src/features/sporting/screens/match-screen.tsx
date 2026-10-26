import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useConsultationQueries } from "../api/use-consultation-queries";
import { ResourceFeedback, ResourcePage } from "../components/resource-page";
import { MatchSummary } from "../components/match-summary";
import { MatchSetScores } from "../components/match-set-scores";
import { MatchInformation } from "../components/match-information";
import { currentSportingTimeZone } from "../model/sporting-time";

/** Exact dated public match identity; document/contribution/support integrations remain owner work. */
export interface MatchScreenProps {
  matchId: string;
}

/** Presents independent accepted match facts; a missing secondary section never replaces another. */
export function MatchScreen({ matchId }: MatchScreenProps) {
  const [presentation, setPresentation] = useState(() => ({
    timeZone: currentSportingTimeZone(),
  }));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        // A fresh context also rerenders relative dates when the phone zone is unchanged.
        setPresentation({
          timeZone: currentSportingTimeZone(),
        });
      }
    });
    return () => subscription.remove();
  }, []);
  const queries = useConsultationQueries();
  const match = useQuery(queries.match(matchId));
  const data = match.data;
  const feedback = useActionFeedback();
  /** A failed explicit refresh keeps authorized content and reports only the attempted read. */
  async function refresh() {
    const result = await match.refetch({ cancelRefetch: false });
    if (result.isError && result.data && !isAccessDenied(result.error))
      feedback.error();
  }
  return (
    <ResourcePage
      state={!data ? <ResourceFeedback query={match} /> : undefined}
      refreshing={match.isRefetching}
      onRefresh={() => void refresh()}
    >
      {data && (
        <>
          <MatchSummary
            match={data.match}
            displayTimeZone={presentation.timeZone}
          />
          <MatchSetScores match={data.match} sets={data.sets} />
          <MatchInformation
            detail={data}
            displayTimeZone={presentation.timeZone}
          />
        </>
      )}
    </ResourcePage>
  );
}
