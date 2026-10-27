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
import type { TeamLogoSelectionEnum } from "../../../../.generated/schemas/index.zod";
import { ListMatchesParams } from "../../../../.generated/schemas/index.zod";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
import { binaryImagePreview } from "../../../shared/api/binary-image-preview";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import type { SessionSnapshot } from "../../accounts/session/session-generation";
import type { useOrdinaryRequest } from "../../access/ordinary-request";
import { resourceUnavailable } from "../model/consultation-availability";
import { removeUnavailableCalendarMatch } from "./sporting-calendar";

/** Captured F05 generation guards public completions without requiring an established account. */
type ConsultationSession = SessionSnapshot &
  NonNullable<ApiFetchOptions["session"]>;

/** Existing F12 ordinary admission; only deliberate bypass carries a personal context. */
type ConsultationAdmission = Pick<
  ReturnType<typeof useOrdinaryRequest>,
  "request"
> &
  Partial<Pick<ReturnType<typeof useOrdinaryRequest>, "bypass">>;

/** Detail opening refreshes common information/artwork; virtualized discovery rows retain ordinary defaults. */
export const consultationOpeningPolicy = {
  refetchOnMount: "always",
  retryOnMount: true,
} as const;

/**
 * Creates typed native Query options for one captured session/bypass context. Consumers of the same
 * F12 intent share its owner identity and native Query cache; a new intent gets a separate context.
 * Ordinary reads start without credentials, profile or Pro. Explicit bypass obtains credentials
 * for each execution, then F12 rechecks current intent/grants before preparing the request.
 * Resource/season/category/zone keys isolate selections; F13 transport rejects obsolete session
 * or cancelled bypass results even when native cancellation loses the response-body race.
 * Detail resources explicitly reread when opened; child selections retain their own policy.
 * This foundation adds no infinite traversal, persistence, foreground refresh or retry loop.
 */
export function createConsultationQueries(
  session: ConsultationSession,
  admission: ConsultationAdmission,
  getCredentials: () => Promise<{ accessToken: string } | undefined>,
) {
  const intent = admission.bypass;

  /** Adds only the captured public or deliberate-bypass identity to the generated resource key. */
  function key(generatedKey: QueryKey) {
    return intent
      ? getSessionQueryKey(session.generation, [
          "consultation-bypass",
          intent.accountId,
          intent.intentId,
          ...generatedKey,
        ])
      : ["consultation", session.generation, ...generatedKey];
  }

  /** Clears forbidden retained content without replacing the query's error or request lifecycle. */
  function rejectUnavailable(
    error: unknown,
    context: QueryFunctionContext,
  ): never {
    if (!context.signal.aborted && resourceUnavailable(error)) {
      // setQueryData(undefined) is a no-op; removing an active query changes its lifecycle.
      context.client
        .getQueryCache()
        .find({ queryKey: context.queryKey, exact: true })
        ?.setState({ data: undefined, dataUpdatedAt: 0 });
    }
    throw error;
  }

  /** Prepares fresh F12 options after credentials, preserving current refusal cleanup. */
  async function request(
    context: QueryFunctionContext,
  ): Promise<ApiFetchOptions> {
    try {
      let headers: Record<string, string> | undefined;
      if (intent) {
        const credentials = await getCredentials();
        if (!credentials?.accessToken) throw new ApiError("http", 401);
        headers = { Authorization: `Bearer ${credentials.accessToken}` };
      }
      return admission.request({ session, signal: context.signal, headers });
    } catch (error) {
      return rejectUnavailable(error, context);
    }
  }

  /** Decodes binary data in the request owner and refuses late native conversion completions. */
  async function preview(blob: Blob, signal: AbortSignal) {
    const uri = await binaryImagePreview(blob, signal);
    if (!session.isCurrent(session.generation) || signal.aborted)
      throw new ApiError("cancelled");
    return uri;
  }

  return {
    /** Current club PNG/JPEG through the generated binary transport and the same admission. */
    clubLogo: (clubId: string) =>
      queryOptions({
        queryKey: key(getGetClubLogoQueryKey(clubId)),
        queryFn: async (context) => {
          try {
            const options = await request(context);
            const blob = await getClubLogo(clubId, options);
            return await preview(blob, options.signal ?? context.signal);
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      }),
    /** Exact effective or automatic artwork selection; no manual/automatic cache collision. */
    teamLogo: (
      teamId: string,
      selection: TeamLogoSelectionEnum = "effective",
    ) => {
      const params = Object.freeze({ selection });
      return queryOptions({
        queryKey: key(getGetTeamLogoQueryKey(teamId, params)),
        queryFn: async (context) => {
          try {
            const options = await request(context);
            const blob = await getTeamLogo(teamId, params, options);
            return await preview(blob, options.signal ?? context.signal);
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      });
    },
    /** Current active division artwork, without credentials for an ordinary public read. */
    divisionLogo: (divisionId: string) =>
      queryOptions({
        queryKey: key(getGetDivisionLogoQueryKey(divisionId)),
        queryFn: async (context) => {
          try {
            const options = await request(context);
            const blob = await getDivisionLogo(divisionId, options);
            return await preview(blob, options.signal ?? context.signal);
          } catch (error) {
            return rejectUnavailable(error, context);
          }
        },
      }),
    /** Current club facts on opening, independent of selected team/calendar season. */
    club: (clubId: string) =>
      queryOptions({
        ...consultationOpeningPolicy,
        queryKey: key(getGetClubQueryKey(clubId)),
        queryFn: async (context) =>
          getClub(clubId, await request(context)).catch((error: unknown) =>
            rejectUnavailable(error, context),
          ),
      }),
    /** Exact club season; selection changes cannot admit a previous season as current data. */
    clubTeams: (clubId: string, seasonId: string) => {
      const params = Object.freeze({ seasonId });
      return queryOptions({
        queryKey: key(getListClubTeamsQueryKey(clubId, params)),
        queryFn: async (context) =>
          listClubTeams(clubId, params, await request(context)).catch(
            (error: unknown) => rejectUnavailable(error, context),
          ),
      });
    },
    /** Current team context on opening, with its exact identity and viewable relationships. */
    team: (teamId: string) =>
      queryOptions({
        ...consultationOpeningPolicy,
        queryKey: key(getGetTeamQueryKey(teamId)),
        queryFn: async (context) =>
          getTeam(teamId, await request(context)).catch((error: unknown) =>
            rejectUnavailable(error, context),
          ),
      }),
    /** Current pool facts on opening; standings and participants remain independent queries. */
    pool: (poolId: string) =>
      queryOptions({
        ...consultationOpeningPolicy,
        queryKey: key(getGetPoolQueryKey(poolId)),
        queryFn: async (context) =>
          getPool(poolId, await request(context)).catch((error: unknown) =>
            rejectUnavailable(error, context),
          ),
      }),
    /** Official table availability and accepted freshness without locally computed statistics. */
    standings: (poolId: string) =>
      queryOptions({
        queryKey: key(getGetPoolStandingsQueryKey(poolId)),
        queryFn: async (context) =>
          getPoolStandings(poolId, await request(context)).catch(
            (error: unknown) => rejectUnavailable(error, context),
          ),
      }),
    /** Viewable pool participants, regardless of standings availability or map coverage. */
    participants: (poolId: string) =>
      queryOptions({
        queryKey: key(getListPoolParticipantsQueryKey(poolId)),
        queryFn: async (context) =>
          listPoolParticipants(poolId, await request(context)).catch(
            (error: unknown) => rejectUnavailable(error, context),
          ),
      }),
    /** One immutable calendar request; story tasks own infinite traversal and successful refresh. */
    calendar: (input: ListMatchesParams) => {
      const params = Object.freeze(ListMatchesParams.strict().parse(input));
      const selectors = [params.clubId, params.teamId, params.poolId].filter(
        (value) => value !== undefined,
      );
      if (
        selectors.length !== 1 ||
        (params.clubId !== undefined) !== (params.seasonId !== undefined)
      )
        throw new Error("Calendar requires a club/season, team or pool");
      // Native Intl validates the selected grouping zone without a second time-zone registry.
      new Intl.DateTimeFormat("en", { timeZone: params.timeZone });
      return {
        queryKey: key(getListMatchesQueryKey(params)),
        queryFn: async (context: QueryFunctionContext) =>
          listMatches(params, await request(context)).catch((error: unknown) =>
            rejectUnavailable(error, context),
          ),
      };
    },
    /** Current dated match facts on opening; foreground refresh belongs to the match story. */
    match: (matchId: string) =>
      queryOptions({
        ...consultationOpeningPolicy,
        queryKey: key(getGetMatchQueryKey(matchId)),
        queryFn: async (context) => {
          try {
            return await getMatch(matchId, await request(context));
          } catch (error) {
            if (!context.signal.aborted && resourceUnavailable(error))
              await removeUnavailableCalendarMatch(
                context.client,
                key(getListMatchesQueryKey()),
                matchId,
              );
            return rejectUnavailable(error, context);
          }
        },
      }),
  };
}
