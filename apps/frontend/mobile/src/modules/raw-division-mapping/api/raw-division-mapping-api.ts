import {
  listRawDivisions,
  updateRawDivision,
} from "@/src/shared/generated/endpoints/config-secure";
import type { UpdateRawDivisionMappingRequest } from "@/src/shared/generated/models";

/** Expose raw-division mapping operations through the feature API boundary. */
export class RawDivisionMappingApi {
  /** Load raw division mappings matching the optional provider filters. */
  public getRawDivisionMappings(leagueCode?: string, season?: string) {
    return listRawDivisions({ leagueCode, season });
  }

  /** Update one raw division mapping. */
  public updateRawDivisionMapping(
    id: number,
    data: UpdateRawDivisionMappingRequest,
  ) {
    return updateRawDivision(id, data);
  }
}
