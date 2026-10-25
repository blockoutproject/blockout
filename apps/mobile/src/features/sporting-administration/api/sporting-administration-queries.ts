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
import { getSessionQueryKey } from "../../../shared/query/query-client";

/** Current sporting authority prepares credentials and rechecks the action grant for every execution. */
export interface SportingQueryAuthority {
  session: { generation: string; isCurrent(generation: string): boolean };
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
      return queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getListDivisionsQueryKey(params),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          listDivisions(params, await authority.request(signal)),
      });
    },
    /** One division DTO is shared by presentation and lifecycle consumers. */
    division: (id: string) =>
      queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getGetDivisionQueryKey(id),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getDivision(id, await authority.request(signal)),
      }),
    /** Original club presentation retains its editing revision without a cache-specific wrapper. */
    clubPresentation: (id: string) =>
      queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getGetClubPresentationQueryKey(id),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getClubPresentation(id, await authority.request(signal)),
      }),
    /** Original team presentation includes effective and automatic artwork selection. */
    teamPresentation: (id: string) =>
      queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getGetTeamPresentationQueryKey(id),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getTeamPresentation(id, await authority.request(signal)),
      }),
    /** Pool presentation remains distinct from sporting classification and public consultation. */
    poolPresentation: (id: string) =>
      queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getGetPoolPresentationQueryKey(id),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getPoolPresentation(id, await authority.request(signal)),
      }),
    /** Pack classification retains one generated key for all correction consumers. */
    packClassification: (id: string) =>
      queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getGetPackClassificationQueryKey(id),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getPackClassification(id, await authority.request(signal)),
      }),
    /** Pool classification retains the same read shape as its revision-guarded command response. */
    poolClassification: (id: string) =>
      queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getGetPoolClassificationQueryKey(id),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getPoolClassification(id, await authority.request(signal)),
      }),
  };
}
