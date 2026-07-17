import type {
  LiveLinkStatusEnum,
  LiveProviderEnum,
  MatchStatusEnum,
  MobileMatchDayPageResponse,
  MobileMatchDetail,
  MobileMatchLiveLinkHistoryItem,
  MobileMatchListItem,
  MobileMatchListPool,
  MobileMatchModerationItem,
  MobileMatchRankingTeam,
} from '@/src/api/generated/mobile-gateway/models';
import type {
  EnrichedDayPageDTO,
  EnrichedMatchDTO,
  EnrichedMatchLiveSummaryDTO,
  LiveLinkStatus,
  LiveProvider,
  MatchDetailPoolView,
  MatchListItemView,
  MatchListPoolView,
  MatchLiveLinkDTO,
} from '@/src/types/Match';
import { MatchStatus } from '@/src/types/Match';
import type { RankingTeamView } from '@/src/types/Team';
import { toGenderView } from '@/src/hooks/catalog/catalogView';

const matchStatusViewByWire: Record<MatchStatusEnum, MatchStatus> = {
  UPCOMING: MatchStatus.UPCOMING,
  FINISHED: MatchStatus.FINISHED,
};

const liveProviderViewByWire: Record<LiveProviderEnum, LiveProvider> = {
  YOUTUBE: 'YOUTUBE',
  TWITCH: 'TWITCH',
  FACEBOOK: 'FACEBOOK',
};

const liveLinkStatusViewByWire: Record<LiveLinkStatusEnum, LiveLinkStatus> = {
  ACTIVE: 'ACTIVE',
  DEACTIVATED: 'DEACTIVATED',
  BANNED: 'BANNED',
  EXPIRED: 'EXPIRED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
};

function toMatchListItemView(response: MobileMatchListItem): MatchListItemView {
  return {
    id: response.id,
    matchDate: response.matchDate,
    set: response.set,
    status: matchStatusViewByWire[response.status],
    liveUrl: response.liveUrl,
    teamA: response.teamA
      ? {
          shortName: response.teamA.shortName,
          logoUrl: response.teamA.logoUrl,
        }
      : null,
    teamB: response.teamB
      ? {
          shortName: response.teamB.shortName,
          logoUrl: response.teamB.logoUrl,
        }
      : null,
  };
}

function toMatchListPoolView(response: MobileMatchListPool): MatchListPoolView {
  return {
    id: response.id,
    leagueCode: response.leagueCode,
    leagueName: response.leagueName,
    shortName: response.shortName,
    gender: toGenderView(response.gender),
    division: {
      name: response.division.name,
      firstGradientColor: response.division.firstGradientColor,
      secondGradientColor: response.division.secondGradientColor,
      thirdGradientColor: response.division.thirdGradientColor,
      logoUrl: response.division.logoUrl,
    },
  };
}

/** Projects one canonical match-day page without changing owner ordering or continuation. */
export function toMatchDayPageView(
  response: MobileMatchDayPageResponse,
): EnrichedDayPageDTO {
  return {
    dayMatches: response.dayMatches.map((day) => ({
      date: day.date,
      pools: day.pools.map((poolGroup) => ({
        pool: toMatchListPoolView(poolGroup.pool),
        matches: poolGroup.matches.map(toMatchListItemView),
      })),
    })),
    hasNext: response.hasNext,
    nextPage: response.nextPage,
  };
}

function toMatchRankingTeamView(
  response: MobileMatchRankingTeam,
): RankingTeamView {
  return {
    id: response.id,
    shortName: response.shortName,
    logoUrl: response.logoUrl,
    points: response.points,
    played: response.played,
    wins: response.wins,
    losses: response.losses,
  };
}

function toMatchDetailPoolView(
  response: MobileMatchDetail['pool'],
): MatchDetailPoolView {
  return {
    id: response.id,
    season: response.season,
    poolCode: response.poolCode,
    leagueCode: response.leagueCode,
    leagueName: response.leagueName,
    name: response.name,
    shortName: response.shortName,
    gender: toGenderView(response.gender),
    ranking: response.ranking.map(toMatchRankingTeamView),
    division: {
      name: response.division.name,
      mainColor: response.division.mainColor,
      firstGradientColor: response.division.firstGradientColor,
      secondGradientColor: response.division.secondGradientColor,
      thirdGradientColor: response.division.thirdGradientColor,
      logoUrl: response.division.logoUrl,
    },
  };
}

/** Projects the canonical all-or-error match detail into the existing screen view. */
export function toEnrichedMatchView(
  response: MobileMatchDetail,
): EnrichedMatchDTO {
  return {
    id: response.id,
    matchDate: response.matchDate,
    status: matchStatusViewByWire[response.status],
    set: response.set,
    score: response.score,
    venue: response.venue,
    firstReferee: response.firstReferee,
    secondReferee: response.secondReferee,
    teamA: {
      id: response.teamA.id,
      name: response.teamA.name,
      shortName: response.teamA.shortName,
      logoUrl: response.teamA.logoUrl,
    },
    teamB: {
      id: response.teamB.id,
      name: response.teamB.name,
      shortName: response.teamB.shortName,
      logoUrl: response.teamB.logoUrl,
    },
    pool: toMatchDetailPoolView(response.pool),
    liveUrl: response.liveUrl,
    liveProvider: response.liveProvider
      ? liveProviderViewByWire[response.liveProvider]
      : null,
    matchAddressPdfUrl: response.signedDocuments.addressPdfUrl,
    matchSheetPdfUrl: response.signedDocuments.sheetPdfUrl,
    liveOwnerAuth0Id: response.liveOwnerAuth0Id,
  };
}

export function toMatchLiveLinkView(
  response: MobileMatchLiveLinkHistoryItem,
): MatchLiveLinkDTO {
  return {
    id: response.id,
    provider: liveProviderViewByWire[response.provider],
    url: response.url,
    status: liveLinkStatusViewByWire[response.status],
    reportCount: response.reportCount,
    ownerAuth0Id: response.ownerAuth0Id,
    createdAt: response.createdAt,
    lastUpdate: response.lastUpdate,
  };
}

export function toMatchModerationView(
  response: MobileMatchModerationItem,
): EnrichedMatchLiveSummaryDTO {
  return {
    id: response.id,
    matchDate: response.matchDate,
    season: response.season,
    set: response.set,
    lastLiveLinkStatus: response.lastLiveLinkStatus
      ? liveLinkStatusViewByWire[response.lastLiveLinkStatus]
      : null,
    lastLiveLinkCreatedAt: response.lastLiveLinkCreatedAt,
    teamA: {
      name: response.teamA.name,
      shortName: response.teamA.shortName,
      logoUrl: response.teamA.logoUrl,
    },
    teamB: {
      name: response.teamB.name,
      shortName: response.teamB.shortName,
      logoUrl: response.teamB.logoUrl,
    },
    pool: {
      shortName: response.pool.shortName,
      leagueName: response.pool.leagueName,
      division: {
        name: response.pool.division.name,
        firstGradientColor: response.pool.division.firstGradientColor,
        secondGradientColor: response.pool.division.secondGradientColor,
        thirdGradientColor: response.pool.division.thirdGradientColor,
      },
    },
  };
}
