import type { MatchStatusEnum } from "@/src/shared/generated/models";
import { formatMatchDateTime } from "@/src/modules/match/view-models/match-date";

type MatchStatusSource = {
  liveUrl?: string | null;
  matchDate: string;
  status: MatchStatusEnum;
};

export type MatchRowPresentation = {
  isFinished: boolean;
  isUpcoming: boolean;
  livePillLabel: "Live" | "Rediffusion" | null;
  time: string;
};

/**
 * Derives the compact row state with native date work only, keeping repeated
 * list rows free of the detailed score parsing path.
 */
export function createMatchRowPresentation(
  match: MatchStatusSource,
): MatchRowPresentation {
  const date = new Date(match.matchDate ?? "");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const isFinished = match.status === "FINISHED";
  const hasLiveLink = Boolean(match.liveUrl);

  return {
    isFinished,
    isUpcoming: match.status === "UPCOMING",
    livePillLabel: hasLiveLink ? (isFinished ? "Rediffusion" : "Live") : null,
    time: `${hours}:${minutes}`,
  };
}

type MatchScoreSource = {
  score?: string | null;
  set?: string | null;
};

export type MatchStatusPresentation = {
  date: string;
  hasLiveLink: boolean;
  isFinished: boolean;
  isMatchStarted: boolean;
  isUpcoming: boolean;
  livePillLabel: "Live" | "Rediffusion" | null;
  time: string;
};

/**
 * Owns the status and timestamp derivation shared by match score surfaces.
 */
export function createMatchStatusPresentation(
  match: MatchStatusSource,
  now = new Date(),
): MatchStatusPresentation {
  const { date, time } = formatMatchDateTime(match.matchDate);
  const isFinished = match.status === "FINISHED";
  const isUpcoming = match.status === "UPCOMING";
  const hasLiveLink = Boolean(match.liveUrl);
  const matchTime = new Date(match.matchDate).getTime();

  return {
    date,
    hasLiveLink,
    isFinished,
    isMatchStarted: !Number.isNaN(matchTime) && now.getTime() >= matchTime,
    isUpcoming,
    livePillLabel: hasLiveLink ? (isFinished ? "Rediffusion" : "Live") : null,
    time,
  };
}

export type MatchScoreBreakdown = {
  awayFinal: string;
  awaySets: number[];
  homeFinal: string;
  homeSets: number[];
  maxSets: number;
};

/**
 * Parses the final and per-set score once for the detailed score table.
 */
export function createMatchScoreBreakdown(
  match: MatchScoreSource,
): MatchScoreBreakdown {
  const sets = match.score
    ? match.score
        .split(",")
        .map((setScore) =>
          setScore.split("-").map((value) => parseInt(value, 10)),
        )
    : [];
  const [homeFinal = "0", awayFinal = "0"] = (match.set || "0-0").split("-");

  return {
    awayFinal,
    awaySets: sets.map(([, away]) => away),
    homeFinal,
    homeSets: sets.map(([home]) => home),
    maxSets: sets.length,
  };
}
