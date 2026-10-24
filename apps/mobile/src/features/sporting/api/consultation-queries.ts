import { queryOptions, type QueryKey } from "@tanstack/react-query";
import {
  getClub,
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
import { ListMatchesParams } from "../../../../.generated/schemas/index.zod";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import type { SessionSnapshot } from "../../accounts/session/session-generation";
import type { useOrdinaryRequest } from "../../access/ordinary-request";

/** Captured F05 generation guards public completions without requiring an established account. */
type ConsultationSession = SessionSnapshot &
  NonNullable<ApiFetchOptions["session"]>;

/** Existing F12 ordinary admission; only deliberate bypass carries a personal context. */
type ConsultationAdmission = Pick<
  ReturnType<typeof useOrdinaryRequest>,
  "request"
> &
  Partial<Pick<ReturnType<typeof useOrdinaryRequest>, "bypass">>;

/**
 * Creates typed native Query options for one captured session/bypass context. Consumers of the same
 * F12 intent share its owner identity and native Query cache; a new intent gets a separate context.
 * Ordinary reads start without credentials, profile or Pro. Explicit bypass obtains credentials
 * for each execution, then F12 rechecks current intent/grants before preparing the request.
 * Resource/season/category/zone keys isolate selections; F13 transport rejects obsolete session
 * or cancelled bypass results even when native cancellation loses the response-body race.
 * This foundation chooses no screen refresh, infinite-pagination or retention policy.
 */
export function createConsultationQueries(
  session: ConsultationSession,
  admission: ConsultationAdmission,
  getCredentials: () => Promise<{ accessToken: string } | undefined>,
) {
  const intent = admission.bypass;

  /** Prepares each request immediately after credentials; captured options are never reused. */
  async function request(signal: AbortSignal): Promise<ApiFetchOptions> {
    let headers: Record<string, string> | undefined;
    if (intent) {
      const credentials = await getCredentials();
      if (!credentials?.accessToken) throw new ApiError("http", 401);
      headers = { Authorization: `Bearer ${credentials.accessToken}` };
    }
    return admission.request({ session, signal, headers });
  }

  /** Shares only feature request preparation; the generated transport owns decoding and errors. */
  function query<T>(
    key: QueryKey,
    read: (options: ApiFetchOptions) => Promise<T>,
  ) {
    return queryOptions({
      queryKey: intent
        ? getSessionQueryKey(session.generation, [
            "consultation-bypass",
            intent.accountId,
            intent.intentId,
            ...key,
          ])
        : ["consultation", session.generation, ...key],
      queryFn: async ({ signal }) => read(await request(signal)),
    });
  }

  return {
    /** Common public club facts, independent of selected team/calendar season. */
    club: (clubId: string) =>
      query(getGetClubQueryKey(clubId), (options) => getClub(clubId, options)),
    /** Exact club season; selection changes cannot admit a previous season as current data. */
    clubTeams: (clubId: string, seasonId: string) => {
      const params = Object.freeze({ seasonId });
      return query(getListClubTeamsQueryKey(clubId, params), (options) =>
        listClubTeams(clubId, params, options),
      );
    },
    /** Current team context with its exact identity and viewable relationships. */
    team: (teamId: string) =>
      query(getGetTeamQueryKey(teamId), (options) => getTeam(teamId, options)),
    /** Common pool facts; standings and participants remain independent queries. */
    pool: (poolId: string) =>
      query(getGetPoolQueryKey(poolId), (options) => getPool(poolId, options)),
    /** Official table availability and accepted freshness without locally computed statistics. */
    standings: (poolId: string) =>
      query(getGetPoolStandingsQueryKey(poolId), (options) =>
        getPoolStandings(poolId, options),
      ),
    /** Viewable pool participants, regardless of standings availability or map coverage. */
    participants: (poolId: string) =>
      query(getListPoolParticipantsQueryKey(poolId), (options) =>
        listPoolParticipants(poolId, options),
      ),
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
      return query(getListMatchesQueryKey(params), (options) =>
        listMatches(params, options),
      );
    },
    /** Current dated match facts; screen focus/foreground refresh belongs to the match story. */
    match: (matchId: string) =>
      query(getGetMatchQueryKey(matchId), (options) =>
        getMatch(matchId, options),
      ),
  };
}
