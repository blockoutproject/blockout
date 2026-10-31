import {
  queryOptions,
  type QueryFunctionContext,
  type QueryKey,
} from "@tanstack/react-query";
import {
  getClub,
  getClubLogo,
  getTeamLogo,
  getDivisionLogo,
  getGetClubLogoQueryKey,
  getGetTeamLogoQueryKey,
  getGetDivisionLogoQueryKey,
  getTeam,
  getPool,
  getPoolStandings,
  listPoolParticipants,
  listClubTeams,
  listMatches,
  getMatch,
  getGetClubQueryKey,
  getGetTeamQueryKey,
  getGetPoolQueryKey,
  getGetPoolStandingsQueryKey,
  getListPoolParticipantsQueryKey,
  getListClubTeamsQueryKey,
  getListMatchesQueryKey,
  getGetMatchQueryKey,
} from "../../../../.generated/mobile";
import {
  ListMatchesParams,
  type TeamLogoSelectionEnum,
} from "../../../../.generated/schemas/index.zod";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
import { binaryImagePreview } from "../../../shared/api/binary-image-preview";
import type { SessionSnapshot } from "../../accounts/session/account-session-provider";
import type { useOrdinaryRequest } from "../../access/ordinary-request";
import { resourceUnavailable } from "../model/consultation-availability";

/** Existing ordinary admission; only an explicit maintenance bypass needs credentials. */
type ConsultationAdmission = Pick<
  ReturnType<typeof useOrdinaryRequest>,
  "request"
> &
  Partial<Pick<ReturnType<typeof useOrdinaryRequest>, "bypass">>;

/** Detail entry reads current common facts; mounted panels retain native Query behavior. */
export const consultationOpeningPolicy = {
  refetchOnMount: "always",
  retryOnMount: true,
} as const;

/**
 * Generated keys live in the current account's native QueryClient. Explicit bypass has a separate
 * credentialed key; ordinary public reads need neither account lookup nor credentials. Refusals
 * purge only the refused resource, so sensitive contacts cannot return after a later network error.
 * Previously loaded benign projections refresh independently; no cross-query consistency graph remains.
 */
export function createConsultationQueries(
  session: SessionSnapshot,
  admission: ConsultationAdmission,
  getCredentials: () => Promise<{ accessToken: string } | undefined>,
) {
  const intent = admission.bypass;
  /** Distinguishes credentialed bypass representations from ordinary generated public keys. */
  function key(generated: QueryKey) {
    return intent
      ? [
          "consultation-bypass",
          session.subject,
          session.accountId,
          ...generated,
        ]
      : generated;
  }
  /**
   * Query retains data on failure. This exact-resource purge prevents known-refused contacts,
   * locations and other sensitive facts from reappearing if the next read fails technically.
   * setQueryData(undefined) is a no-op; removing an active query would change its read lifecycle.
   */
  function rejectUnavailable(
    error: unknown,
    context: QueryFunctionContext,
  ): never {
    if (!context.signal.aborted && resourceUnavailable(error)) {
      context.client
        .getQueryCache()
        .find({ queryKey: context.queryKey, exact: true })
        ?.setState({ data: undefined, dataUpdatedAt: 0 });
    }
    throw error;
  }
  /** Obtains captured-principal credentials only for bypass; generated transport owns response validation. */
  async function request(
    context: QueryFunctionContext,
  ): Promise<ApiFetchOptions> {
    let headers: Record<string, string> | undefined;
    if (intent) {
      const credentials = await getCredentials();
      if (!credentials?.accessToken) throw new ApiError("http", 401);
      headers = { Authorization: `Bearer ${credentials.accessToken}` };
    }
    return admission.request({ signal: context.signal, headers });
  }
  /** Converts only authenticated artwork; ordinary public logos use native image loading. */
  async function preview(blob: Blob, signal: AbortSignal) {
    return binaryImagePreview(blob, signal);
  }
  return {
    /** An unavailable followed target invalidates its own detail; related benign collections refresh normally. */
    async rejectTarget(
      context: QueryFunctionContext,
      type: "team" | "pool",
      id: string,
      error: ApiError,
    ) {
      if (context.signal.aborted || error.status !== 404) return;
      await context.client.invalidateQueries({
        queryKey: key(
          type === "team" ? getGetTeamQueryKey(id) : getGetPoolQueryKey(id),
        ),
        exact: true,
      });
    },
    /** Credentialed club artwork retains the generated redirect-safe binary request. */
    clubLogo: (id: string) =>
      queryOptions({
        queryKey: key(getGetClubLogoQueryKey(id)),
        queryFn: async (context) => {
          try {
            return await preview(
              await getClubLogo(id, await request(context)),
              context.signal,
            );
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      }),
    /** Effective and automatic team artwork keep distinct generated credentialed keys. */
    teamLogo: (id: string, selection: TeamLogoSelectionEnum = "effective") => {
      const params = { selection };
      return queryOptions({
        queryKey: key(getGetTeamLogoQueryKey(id, params)),
        queryFn: async (context) => {
          try {
            return await preview(
              await getTeamLogo(id, params, await request(context)),
              context.signal,
            );
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      });
    },
    /** Credentialed division artwork keeps the generated request and local refusal purge. */
    divisionLogo: (id: string) =>
      queryOptions({
        queryKey: key(getGetDivisionLogoQueryKey(id)),
        queryFn: async (context) => {
          try {
            return await preview(
              await getDivisionLogo(id, await request(context)),
              context.signal,
            );
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      }),
    /** Current club facts include sensitive contacts and are purged locally on refusal. */
    club: (id: string) =>
      queryOptions({
        ...consultationOpeningPolicy,
        queryKey: key(getGetClubQueryKey(id)),
        queryFn: async (context) => {
          try {
            return await getClub(id, await request(context));
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      }),
    /** A generated season key isolates each club's team selection. */
    clubTeams: (id: string, seasonId: string) =>
      queryOptions({
        queryKey: key(getListClubTeamsQueryKey(id, { seasonId })),
        queryFn: async (context) => {
          try {
            return await listClubTeams(
              id,
              { seasonId },
              await request(context),
            );
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      }),
    /** A team refusal clears its own detail while standings/cards remain eventually refreshed projections. */
    team: (id: string) =>
      queryOptions({
        ...consultationOpeningPolicy,
        queryKey: key(getGetTeamQueryKey(id)),
        queryFn: async (context) => {
          try {
            return await getTeam(id, await request(context));
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      }),
    /** Current pool facts have their own error and local data lifetime. */
    pool: (id: string) =>
      queryOptions({
        ...consultationOpeningPolicy,
        queryKey: key(getGetPoolQueryKey(id)),
        queryFn: async (context) => {
          try {
            return await getPool(id, await request(context));
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      }),
    /** Official standings read independently of detail, participants and calendar projections. */
    standings: (id: string) =>
      queryOptions({
        ...consultationOpeningPolicy,
        queryKey: key(getGetPoolStandingsQueryKey(id)),
        queryFn: async (context) => {
          try {
            return await getPoolStandings(id, await request(context));
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      }),
    /** Viewable map participants read and fail independently of the standings. */
    participants: (id: string) =>
      queryOptions({
        queryKey: key(getListPoolParticipantsQueryKey(id)),
        queryFn: async (context) => {
          try {
            return await listPoolParticipants(id, await request(context));
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      }),
    /** Validates the domain selector and zone; Query owns the returned server continuation. */
    calendar: (input: ListMatchesParams) => {
      const params = ListMatchesParams.strict().parse(input);
      const selectors = [params.clubId, params.teamId, params.poolId].filter(
        (value) => value !== undefined,
      );
      if (
        selectors.length !== 1 ||
        (params.clubId !== undefined) !== (params.seasonId !== undefined)
      )
        throw new Error("Calendar requires a club/season, team or pool");
      new Intl.DateTimeFormat("en", { timeZone: params.timeZone });
      return {
        queryKey: key(getListMatchesQueryKey(params)),
        queryFn: async (context: QueryFunctionContext) => {
          try {
            return await listMatches(params, await request(context));
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      };
    },
    /** Match location/referee facts are removed locally after an actual resource refusal. */
    match: (id: string) =>
      queryOptions({
        ...consultationOpeningPolicy,
        meta: { sportingMatchId: id },
        queryKey: key(getGetMatchQueryKey(id)),
        queryFn: async (context) => {
          try {
            return await getMatch(id, await request(context));
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      }),
  };
}
