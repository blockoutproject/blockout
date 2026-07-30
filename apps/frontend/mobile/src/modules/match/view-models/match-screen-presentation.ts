import type { AppTheme } from "@/src/shared/theme";
import type { TeamHighlight } from "@/src/modules/ranking/model/team-highlight";
import { formatMatchDateTime } from "@/src/modules/match/view-models/match-date";
import { getMatchRankingHighlights } from "@/src/modules/match/view-models/match-ranking-highlight";
import { isLNV } from "@/src/shared/view-models/league";

export type MatchScreenPresentation = {
  gradient: readonly [string, string, ...string[]];
  highlightTeams: TeamHighlight[];
  showLiveLinkCard: boolean;
  timeText: string | null;
};

type MatchPresentationSource = {
  liveUrl?: string | null;
  matchDate: string;
  set?: string | null;
  teamA: { id: number };
  teamB: { id: number };
  pool: {
    leagueCode: string;
    division: {
      firstGradientColor: string;
      mainColor: string;
      secondGradientColor: string;
      thirdGradientColor: string;
    };
  };
};

/**
 * Derives presentation-only match details from the API response and theme.
 */
export function createMatchScreenPresentation(
  match: MatchPresentationSource,
  theme: AppTheme,
  canCreateLiveLink: boolean,
): MatchScreenPresentation {
  const division = match.pool.division;

  return {
    gradient: [
      division.firstGradientColor,
      division.secondGradientColor,
      division.thirdGradientColor,
    ],
    highlightTeams: getMatchRankingHighlights(theme, {
      teamA: match.teamA,
      teamB: match.teamB,
      set: match.set ?? null,
      highlightColor: division.mainColor,
    }),
    showLiveLinkCard:
      !isLNV(match.pool.leagueCode) &&
      (Boolean(match.liveUrl) || canCreateLiveLink),
    timeText: formatMatchDateTime(match.matchDate).time ?? null,
  };
}
