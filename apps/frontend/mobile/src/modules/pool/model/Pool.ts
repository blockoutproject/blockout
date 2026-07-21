import type { DivisionResponse } from "@/src/modules/division/model/Division";
import type { EnumFormat } from "@/src/shared/model/enums/Format";
import type { EnumGender } from "@/src/shared/model/enums/Gender";
import type { TeamWithStatsResponse } from "@/src/modules/team/model/Team";

export type PoolInternalResponse = {
  id: number;
  poolCode: string;
  leagueCode: string;
  season: string;
  divisionId: number;
  gender: EnumGender;
  format: EnumFormat;
  leagueName: string;
  rawName: string;
  name: string;
  shortName: string;
  followersCount: number;
  active: boolean;
  createdAt: string;
  lastUpdate: string;
};

export type UpdatePoolRequest = {
  poolCode?: string;
  leagueCode?: string;
  season?: string;
  leagueName?: string;
  rawName?: string;
  name?: string;
  shortName?: string;
  divisionId?: number;
  format?: EnumFormat;
  gender?: EnumGender;
  active?: boolean;
};

export type PoolResponse = {
  id: number;
  season: string;
  leagueCode: string;
  leagueName: string;
  poolCode: string;
  name: string;
  shortName: string;
  rawName: string;
  format: EnumFormat;
  gender: EnumGender;
  followersCount: number;
  ranking: TeamWithStatsResponse[];
  division: DivisionResponse;
};

export type PoolSummaryResponse = {
  id: number;
  name: string;
  shortName: string;
  season: string;
  gender: EnumGender;
  format: EnumFormat;
  division: DivisionResponse;
  leagueCode: string;
  leagueName: string;
};
