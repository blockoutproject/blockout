import {
  useInfiniteQuery,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createCollectionQueries } from "./collection-queries";
import { useAuth0 } from "react-native-auth0";
import {
  confirmCollectionSourceSeason,
  createCollectionSource,
  getGetCollectionSeasonQueryKey,
  getGetMyAccountQueryKey,
  getListCollectionSeasonsQueryKey,
  getListCollectionSourcesQueryKey,
  launchCollectionSources,
  requestCollectionSourceValidation,
  setCollectionSourceCandidate,
  getCreateCollectionSourceMutationKey,
  getLaunchCollectionSourcesMutationKey,
  getSetCollectionSourceCandidateMutationKey,
  getRequestCollectionSourceValidationMutationKey,
  getConfirmCollectionSourceSeasonMutationKey,
} from "../../../../.generated/mobile";
import type {
  AccountResponse,
  ConfirmSourceSeasonRequest,
  CreateSourceBindingRequest,
  LaunchCollectionSourcesRequest,
  RequestSourceValidationRequest,
  SetSourceCandidateRequest,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useAccountSession } from "../../accounts/current-account";
import { useAdministrationCapabilities } from "../../access/api/use-administration-capabilities";
import { useOperationalVersionAdmission } from "../../access/operational-version-admission";

/** Conflicts and ambiguous acknowledgements require current reads, never an automatic mutation replay. */
export function requiresPreparationReread(error: unknown) {
  return (
    isUncertainMutationFailure(error) ||
    (error instanceof ApiError && error.status === 409)
  );
}

/** Current F05 identity and F12 grant for collection requests; server authorization remains authoritative. */
export function useCollectionAuthority() {
  const session = useAccountSession();
  const capabilities = useAdministrationCapabilities();
  const version = useOperationalVersionAdmission();
  const auth = useAuth0();
  const client = useQueryClient();
  const enabled =
    capabilities.permissions?.manageCollection === true && version.satisfied;
  /** Rechecks the live account cache, including held native confirmations and delayed credential retrieval. */
  function assertAuthority() {
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    version.assertCurrent();
    const account = client.getQueryState<AccountResponse>(
      getSessionQueryKey(session.generation, getGetMyAccountQueryKey()),
    );
    if (
      account?.status !== "success" ||
      account.data?.accountId !== session.accountId ||
      account.data.permissions.manageCollection !== true
    )
      throw new ApiError("http", 403);
  }
  /** Captures the session before asynchronous work and refuses unavailable credentials without replay. */
  async function request() {
    assertAuthority();
    const credentials = await auth.getCredentials();
    assertAuthority();
    if (!credentials) throw new ApiError("http", 401);
    return {
      session,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    };
  }
  return { ...capabilities, session, enabled, request };
}

/** Lists canonical seasons only; reads never create seasons or contact a provider. */
export function useCollectionSeasons() {
  const authority = useCollectionAuthority();
  const query = useQuery(createCollectionQueries(authority).seasons());
  return { authority, query };
}

/** Reads only the season needed by provider navigation, sharing its session-scoped cache with editors. */
export function useCollectionSeason(seasonId: string) {
  const authority = useCollectionAuthority();
  const season = useQuery(createCollectionQueries(authority).season(seasonId));
  return { authority, season };
}

/** Complete configuration reads and atomic selected-source launch; selection and drafts belong to the forms. */
export function useSeasonPreparation(seasonId: string) {
  const { authority, season } = useCollectionSeason(seasonId);
  const client = useQueryClient();
  const seasonKey = getSessionQueryKey(
    authority.session.generation,
    getGetCollectionSeasonQueryKey(seasonId),
  );
  const saving = useIsMutating({ mutationKey: seasonKey }) > 0;
  const sourcesOptions = createCollectionQueries(authority).sources(seasonId);
  const sourcesKey = sourcesOptions.queryKey;
  const sources = useQuery(sourcesOptions);
  /** Refreshes only this season's projections after a confirmed command, without retrying the write. */
  function invalidate() {
    if (!authority.session.isCurrent(authority.session.generation))
      throw new ApiError("cancelled");
    void client.invalidateQueries({ queryKey: sourcesKey, exact: true });
    void client.invalidateQueries({ queryKey: seasonKey, exact: true });
  }
  const create = useMutation({
    mutationKey: [...seasonKey, ...getCreateCollectionSourceMutationKey()],
    gcTime: 0,
    mutationFn: async (body: CreateSourceBindingRequest) => {
      const accepted = await createCollectionSource(
        seasonId,
        body,
        await authority.request(),
      );
      invalidate();
      return accepted;
    },
  });
  const launch = useMutation({
    mutationKey: [...seasonKey, ...getLaunchCollectionSourcesMutationKey()],
    gcTime: 0,
    mutationFn: async (body: LaunchCollectionSourcesRequest) => {
      const accepted = await launchCollectionSources(
        seasonId,
        body,
        await authority.request(),
      );
      if (!authority.session.isCurrent(authority.session.generation))
        throw new ApiError("cancelled");
      await client.cancelQueries({ queryKey: seasonKey, exact: true });
      if (!authority.session.isCurrent(authority.session.generation))
        throw new ApiError("cancelled");
      client.setQueryData(seasonKey, accepted);
      void client.invalidateQueries({ queryKey: sourcesKey, exact: true });
      void client.invalidateQueries({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getListCollectionSeasonsQueryKey(),
        ),
        exact: true,
      });
      return accepted;
    },
  });
  return { authority, season, sources, create, launch, saving };
}

/** Candidate commands use canonical generated decoders, with explicit status reads and no polling. */
export function useSourcePreparation(seasonId: string, sourceId: string) {
  const { authority, season } = useCollectionSeason(seasonId);
  const client = useQueryClient();
  const sourceOptions = createCollectionQueries(authority).source(sourceId);
  const queryKey = sourceOptions.queryKey;
  const saving = useIsMutating({ mutationKey: queryKey }) > 0;
  const source = useQuery(sourceOptions);
  /** Cancels older reads before publishing the validated response and invalidating its season projections. */
  async function accept(value: SourceBindingResponse) {
    await client.cancelQueries({ queryKey, exact: true });
    if (!authority.session.isCurrent(authority.session.generation))
      throw new ApiError("cancelled");
    client.setQueryData(queryKey, value);
    void client.invalidateQueries({
      queryKey: getSessionQueryKey(
        authority.session.generation,
        getGetCollectionSeasonQueryKey(seasonId),
      ),
      exact: true,
    });
    void client.invalidateQueries({
      queryKey: getSessionQueryKey(
        authority.session.generation,
        getListCollectionSourcesQueryKey(seasonId),
      ),
      exact: true,
    });
    return value;
  }
  const candidate = useMutation({
    mutationKey: [...queryKey, ...getSetCollectionSourceCandidateMutationKey()],
    gcTime: 0,
    mutationFn: async (body: SetSourceCandidateRequest) =>
      accept(
        await setCollectionSourceCandidate(
          sourceId,
          body,
          await authority.request(),
        ),
      ),
  });
  const validation = useMutation({
    mutationKey: [
      ...queryKey,
      ...getRequestCollectionSourceValidationMutationKey(),
    ],
    gcTime: 0,
    mutationFn: async (body: RequestSourceValidationRequest) =>
      accept(
        await requestCollectionSourceValidation(
          sourceId,
          body,
          await authority.request(),
        ),
      ),
  });
  const confirmation = useMutation({
    mutationKey: [
      ...queryKey,
      ...getConfirmCollectionSourceSeasonMutationKey(),
    ],
    gcTime: 0,
    mutationFn: async (body: ConfirmSourceSeasonRequest) =>
      accept(
        await confirmCollectionSourceSeason(
          sourceId,
          body,
          await authority.request(),
        ),
      ),
  });
  return {
    authority,
    season,
    source,
    candidate,
    validation,
    confirmation,
    saving,
  };
}

/** Paginates discovered direct children without importing classification, totals or provider data. */
export function useSourceChildren(sourceId: string, parentId?: string) {
  const authority = useCollectionAuthority();
  const query = useInfiniteQuery(
    createCollectionQueries(authority).children(sourceId, parentId),
  );
  return { authority, query };
}
