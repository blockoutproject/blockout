import { isAccessDenied } from "../../../shared/api/access-denied";
import { queryOptions } from "@tanstack/react-query";
import {
  getClubPresentation,
  getTeamPresentation,
  getPoolPresentation,
  getDivision,
  listDivisions,
  getPackClassification,
  getPoolClassification,
  getGetClubPresentationQueryKey,
  getGetTeamPresentationQueryKey,
  getGetPoolPresentationQueryKey,
  getGetDivisionQueryKey,
  getListDivisionsQueryKey,
  getGetPackClassificationQueryKey,
  getGetPoolClassificationQueryKey,
} from "../../../../.generated/mobile";
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";

/** Current sporting authority prepares credentials and rechecks the action grant for every execution. */
export interface SportingQueryAuthority {
  enabled: boolean;
  request(signal?: AbortSignal): Promise<ApiFetchOptions>;
}
/** Canonical generated DTO reads; editor-specific projections belong to Query select, never a second cache. */
export function createSportingAdministrationQueries(
  authority: SportingQueryAuthority,
) {
  return {
    /** The same complete division list supplies lifecycle navigation and creation validation. */
    divisions: () => {
      const params = { includeInactive: true };
      return queryOptions<Awaited<ReturnType<typeof listDivisions>>>({
        queryKey: getListDivisionsQueryKey(params),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal, client, queryKey }) => {
          try {
            return await listDivisions(params, await authority.request(signal));
          } catch (error) {
            // A later technical failure cannot restore a catalog whose current read was refused.
            if (!signal.aborted && isAccessDenied(error))
              client
                .getQueryCache()
                .find({ queryKey, exact: true })
                ?.setState({ data: undefined, dataUpdatedAt: 0 });
            throw error;
          }
        },
      });
    },
    /** One division DTO is shared by presentation and lifecycle consumers. */
    division: (id: string) =>
      queryOptions<Awaited<ReturnType<typeof getDivision>>>({
        queryKey: getGetDivisionQueryKey(id),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getDivision(id, await authority.request(signal)),
      }),
    /** Original club presentation retains its editing revision without a cache-specific wrapper. */
    clubPresentation: (id: string) =>
      queryOptions<Awaited<ReturnType<typeof getClubPresentation>>>({
        queryKey: getGetClubPresentationQueryKey(id),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getClubPresentation(id, await authority.request(signal)),
      }),
    /** Original team presentation includes effective and automatic artwork selection. */
    teamPresentation: (id: string) =>
      queryOptions<Awaited<ReturnType<typeof getTeamPresentation>>>({
        queryKey: getGetTeamPresentationQueryKey(id),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getTeamPresentation(id, await authority.request(signal)),
      }),
    /** Pool presentation remains distinct from sporting classification and public consultation. */
    poolPresentation: (id: string) =>
      queryOptions<Awaited<ReturnType<typeof getPoolPresentation>>>({
        queryKey: getGetPoolPresentationQueryKey(id),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getPoolPresentation(id, await authority.request(signal)),
      }),
    /** Pack classification retains one generated key for all correction consumers. */
    packClassification: (id: string) =>
      queryOptions<Awaited<ReturnType<typeof getPackClassification>>>({
        queryKey: getGetPackClassificationQueryKey(id),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getPackClassification(id, await authority.request(signal)),
      }),
    /** Pool classification retains the same read shape as its revision-guarded command response. */
    poolClassification: (id: string) =>
      queryOptions<Awaited<ReturnType<typeof getPoolClassification>>>({
        queryKey: getGetPoolClassificationQueryKey(id),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getPoolClassification(id, await authority.request(signal)),
      }),
  };
}
