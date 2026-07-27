import type { TeamHighlight } from "@/src/modules/ranking/model/team-highlight";
import type { AppTheme } from "@/src/shared/theme";
import { withAlpha } from "@/src/shared/theme";

/** Derive ranking-row highlights from the current match score. */
export function getMatchRankingHighlights(
  theme: AppTheme,
  match: {
    teamA: { id: number };
    teamB: { id: number };
    set: string | null;
    highlightColor: string;
  },
): TeamHighlight[] {
  const { teamA, teamB, set, highlightColor } = match;

  if (!set || set.trim() === "") {
    return [
      { teamId: teamA.id, color: highlightColor },
      { teamId: teamB.id, color: highlightColor },
    ];
  }

  const sets = set
    .split(" ")
    .map((score) => score.split("-").map(Number))
    .filter(([teamAScore, teamBScore]) => {
      return !Number.isNaN(teamAScore) && !Number.isNaN(teamBScore);
    });

  if (sets.length === 0) return [];

  const teamAWins = sets.filter(
    ([teamAScore, teamBScore]) => teamAScore > teamBScore,
  ).length;
  const teamBWins = sets.filter(
    ([teamAScore, teamBScore]) => teamBScore > teamAScore,
  ).length;

  if (teamAWins > teamBWins) {
    return [
      { teamId: teamA.id, color: withAlpha(theme.success, 0.7) },
      { teamId: teamB.id, color: withAlpha(theme.error, 0.7) },
    ];
  }

  return [
    { teamId: teamB.id, color: withAlpha(theme.success, 0.7) },
    { teamId: teamA.id, color: withAlpha(theme.error, 0.7) },
  ];
}
