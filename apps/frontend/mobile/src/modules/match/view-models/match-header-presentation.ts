export type MatchHeaderContent = {
  leagueCode: string;
  poolCode: string;
  scoreText: string | null;
  season: string;
  teamALogo: string | null;
  teamBLogo: string | null;
  timeText: string | null;
};

/**
 * Builds the official FFVB calendar URL when all required match coordinates
 * are available.
 */
export function getFfvbCalendarUrl({
  leagueCode,
  poolCode,
  season,
}: Pick<MatchHeaderContent, "leagueCode" | "poolCode" | "season">):
  string | null {
  if (!season || !leagueCode || !poolCode) {
    return null;
  }

  const query = new URLSearchParams({
    saison: season,
    codent: leagueCode,
    poule: poolCode,
  }).toString();

  return `https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?${query}`;
}
