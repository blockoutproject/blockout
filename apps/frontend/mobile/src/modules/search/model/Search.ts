export type ClubSearchResponse = {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string;
};

export type TeamSearchResponse = {
  id: number;
  name: string;
  shortName: string;
  clubId: string;
  clubName: string;
  clubCity: string;
  logoUrl: string | null;
  divisionName: string;
  format: string;
  gender: string;
  season: string;
};

export type PoolSearchResponse = {
  id: number;
  name: string;
  shortName: string;
  divisionName: string;
  leagueCode: string;
  leagueName: string;
  season: string;
  format: string;
  gender: string;
  logoUrl: string | null;
};
