import {
  useInfiniteQuery,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import {
  confirmCollectionSourceSeason,
  createCollectionSource,
  getCollectionSeason,
  getCollectionSource,
  getGetCollectionSeasonQueryKey,
  getGetCollectionSourceQueryKey,
  getGetMyAccountQueryKey,
  getListCollectionSeasonsQueryKey,
  getListCollectionSourcesQueryKey,
  getListCollectionSourceChildrenQueryKey,
  launchCollectionSources,
  listCollectionSeasons,
  listCollectionSources,
  listCollectionSourceChildren,
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
  const query = useQuery({
    queryKey: getSessionQueryKey(
      authority.session.generation,
      getListCollectionSeasonsQueryKey(),
    ),
    enabled: authority.enabled,
    gcTime: 0,
    queryFn: async ({ signal }) =>
      listCollectionSeasons({ ...(await authority.request()), signal }),
  });
  return { authority, query };
}

/** Reads one season with the same generated, session-scoped key across preparation destinations. */
function useSeason(
  seasonId: string,
  authority: ReturnType<typeof useCollectionAuthority>,
) {
  return useQuery({
    queryKey: getSessionQueryKey(
      authority.session.generation,
      getGetCollectionSeasonQueryKey(seasonId),
    ),
    enabled: authority.enabled,
    gcTime: 0,
    queryFn: async ({ signal }) =>
      getCollectionSeason(seasonId, { ...(await authority.request()), signal }),
  });
}

/** Complete configuration reads and atomic selected-source launch; selection and drafts belong to the forms. */
export function useSeasonPreparation(seasonId: string) {
  const authority = useCollectionAuthority();
  const client = useQueryClient();
  const season = useSeason(seasonId, authority);
  const mutationScope = getSessionQueryKey(
    authority.session.generation,
    getGetCollectionSeasonQueryKey(seasonId),
  );
  const saving = useIsMutating({ mutationKey: mutationScope }) > 0;
  const sourcesKey = getSessionQueryKey(
    authority.session.generation,
    getListCollectionSourcesQueryKey(seasonId),
  );
  const sources = useQuery({
    queryKey: sourcesKey,
    enabled: authority.enabled,
    gcTime: 0,
    queryFn: async ({ signal }) =>
      listCollectionSources(seasonId, {
        ...(await authority.request()),
        signal,
      }),
  });
  /** Refreshes only this season's projections after a confirmed command, without retrying the write. */
  function invalidate() {
    if (!authority.session.isCurrent(authority.session.generation))
      throw new ApiError("cancelled");
    void client.invalidateQueries({ queryKey: sourcesKey, exact: true });
    void client.invalidateQueries({
      queryKey: getSessionQueryKey(
        authority.session.generation,
        getGetCollectionSeasonQueryKey(seasonId),
      ),
      exact: true,
    });
  }
  const create = useMutation({
    mutationKey: [...mutationScope, ...getCreateCollectionSourceMutationKey()],
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
    mutationKey: [...mutationScope, ...getLaunchCollectionSourcesMutationKey()],
    gcTime: 0,
    mutationFn: async (body: LaunchCollectionSourcesRequest) => {
      const accepted = await launchCollectionSources(
        seasonId,
        body,
        await authority.request(),
      );
      if (!authority.session.isCurrent(authority.session.generation))
        throw new ApiError("cancelled");
      await client.cancelQueries({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getGetCollectionSeasonQueryKey(seasonId),
        ),
        exact: true,
      });
      if (!authority.session.isCurrent(authority.session.generation))
        throw new ApiError("cancelled");
      client.setQueryData(
        getSessionQueryKey(
          authority.session.generation,
          getGetCollectionSeasonQueryKey(seasonId),
        ),
        accepted,
      );
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
  const authority = useCollectionAuthority();
  const client = useQueryClient();
  const season = useSeason(seasonId, authority);
  const queryKey = getSessionQueryKey(
    authority.session.generation,
    getGetCollectionSourceQueryKey(sourceId),
  );
  const saving = useIsMutating({ mutationKey: queryKey }) > 0;
  const source = useQuery({
    queryKey,
    enabled: authority.enabled,
    gcTime: 0,
    queryFn: async ({ signal }) =>
      getCollectionSource(sourceId, { ...(await authority.request()), signal }),
  });
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
  const query = useInfiniteQuery({
    queryKey: getSessionQueryKey(
      authority.session.generation,
      getListCollectionSourceChildrenQueryKey(sourceId, { parentId }),
    ),
    initialPageParam: 0,
    enabled: authority.enabled,
    gcTime: 0,
    queryFn: async ({ pageParam, signal }) =>
      listCollectionSourceChildren(
        sourceId,
        { parentId, page: pageParam, size: 50 },
        { ...(await authority.request()), signal },
      ),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  });
  return { authority, query };
}
