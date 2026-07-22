import {
  searchClubs,
  searchPools,
  searchTeams,
} from "@/src/shared/generated/endpoints/search-public";
import type {FormatEnum, GenderEnum} from "@/src/shared/generated/models";

/** Expose search operations through the feature API boundary. */
export class SearchApi {
  /** Search public clubs by name. */
  public searchClubs(query: string) {
    return searchClubs({query}).then((results) => results ?? []);
  }

  /** Search public teams with optional competition filters. */
  public searchTeams(
    query: string,
    season?: string,
    divisionId?: number,
    format?: FormatEnum,
    gender?: GenderEnum,
  ) {
    return searchTeams({query, season, divisionId, format, gender}).then(
      (results) => results ?? [],
    );
  }

  /** Search public pools with optional competition filters. */
  public searchPools(
    query: string,
    season?: string,
    divisionId?: number,
    format?: FormatEnum,
    gender?: GenderEnum,
  ) {
    return searchPools({query, season, divisionId, format, gender}).then(
      (results) => results ?? [],
    );
  }
}
