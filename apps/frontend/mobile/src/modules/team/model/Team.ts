import type { ClubResponse } from "@/src/modules/club/model/Club";
import type { Division } from "@/src/types/Division";
import type { EnumFormat } from "@/src/types/enums/Format";
import type { EnumGender } from "@/src/types/enums/Gender";
import type { PoolResponse } from "@/src/modules/pool/model/Pool";

export type TeamInternalResponse = {
  id: number;
  clubId: string;
  rawName: string;
  name: string;
  shortName: string;
  leagueCode: string;
  divisionId: number;
  format: EnumFormat;
  gender: EnumGender;
  season: string;
  logoUrl: string | null;
  followersCount: number;
  active: boolean;
  createdAt: string;
  lastUpdate: string;
};

export type UpdateTeamRequest = {
  clubId?: string;
  rawName?: string;
  name?: string;
  shortName?: string;
  leagueCode?: string;
  divisionId?: number;
  logoUrl?: string | null;
  season?: string;
  format?: EnumFormat;
  gender?: EnumGender;
  active?: boolean;
};

export type TeamResponse = {
  id: number;
  name: string;
  clubId: string;
  shortName: string;
  rawName: string;
  format: EnumFormat;
  gender: EnumGender;
  season: string;
  followersCount: number;
  logoUrl: string | null;
  club: ClubResponse | null;
  division: Division;
  pools: PoolResponse[];
};

export type TeamSummaryResponse = {
  id: number;
  name: string;
  season: string;
  gender: EnumGender;
  format: EnumFormat;
  logoUrl: string | null;
  division: Division;
  club: ClubResponse;
  shortName: string;
};

export type TeamWithStatsResponse = {
  id: number;
  name: string;
  shortName: string;
  logoUrl: string | null;
  points: number;
  played: number;
  wins: number;
  losses: number;
  pointsPenalty: number;
  coefSets: number;
  coefPoints: number;
  longitude: number | null;
  latitude: number | null;
};

export type TeamHighlight = {
  teamId?: number;
  color: string;
};
