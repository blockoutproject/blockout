import { useSyncExternalStore } from "react";
import { publishCollectionRevision } from "./publish-collection-revision";
import {
  invalidateSeasonPreparation,
  invalidateCollectionSeasons,
} from "./invalidate-collection-reads";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useCommand } from "../../../shared/query/use-command";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createCollectionQueries } from "./collection-queries";
import { useAuth0 } from "react-native-auth0";
import {
  confirmCollectionSourceSeason,
  createCollectionSource,
  getGetMyAccountQueryKey,
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
  CollectionSeasonResponse,
  ConfirmSourceSeasonRequest,
  CreateSourceBindingRequest,
  LaunchCollectionSourcesRequest,
  RequestSourceValidationRequest,
  SetSourceCandidateRequest,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useAccountSession } from "../../accounts/current-account";
import { useAdministrationCapabilities } from "../../access/api/use-administration-capabilities";
import { useOperationalVersionAdmission } from "../../access/operational-version-admission";

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
  const options = createCollectionQueries(authority).season(seasonId);
  const season = useQuery(options);
  const client = useQueryClient();
  const seasonInvalidated = useSyncExternalStore(
    client.getQueryCache().subscribe,
    () => client.getQueryState(options.queryKey)?.isInvalidated ?? false,
  );
  return { authority, season, seasonInvalidated, seasonKey: options.queryKey };
}

/** Complete configuration reads and atomic selected-source launch; selection and drafts belong to the forms. */
export function useSeasonPreparation(seasonId: string) {
  const { authority, season, seasonInvalidated, seasonKey } =
    useCollectionSeason(seasonId);
  const client = useQueryClient();
  const sourcesOptions = createCollectionQueries(authority).sources(seasonId);
  const sourcesKey = sourcesOptions.queryKey;
  const sources = useQuery(sourcesOptions);
  /** A confirmed creation has no complete season projection; invalidate its two owning reads. */
  function acceptCreatedSource() {
    if (!authority.session.isCurrent(authority.session.generation)) return;
    invalidateSeasonPreparation(client, authority.session.generation, seasonId);
  }
  /** Publishes the accepted launch without replacing a newer season already read. */
  async function acceptLaunchedSources(accepted: CollectionSeasonResponse) {
    await client.cancelQueries({ queryKey: seasonKey, exact: true });
    if (!authority.session.isCurrent(authority.session.generation)) return;
    publishCollectionRevision(client, seasonKey, accepted);
    void client.invalidateQueries({ queryKey: sourcesKey, exact: true });
    invalidateCollectionSeasons(client, authority.session.generation);
  }
  const create = useCommand(
    {
      mutationKey: [...seasonKey, ...getCreateCollectionSourceMutationKey()],
      mutationFn: async (body: CreateSourceBindingRequest) =>
        createCollectionSource(seasonId, body, await authority.request()),
      onSuccess: acceptCreatedSource,
    },
    { groupKey: seasonKey, requiresRead: requiresRevisionRead },
  );
  const launch = useCommand(
    {
      mutationKey: [...seasonKey, ...getLaunchCollectionSourcesMutationKey()],
      mutationFn: async (body: LaunchCollectionSourcesRequest) =>
        launchCollectionSources(seasonId, body, await authority.request()),
      onSuccess: acceptLaunchedSources,
    },
    { groupKey: seasonKey, requiresRead: requiresRevisionRead },
  );
  return {
    authority,
    season,
    seasonInvalidated,
    sources,
    create,
    launch,
    seasonKey,
    sourcesKey,
  };
}

/** Candidate commands use canonical generated decoders, with explicit status reads and no polling. */
export function useSourcePreparation(seasonId: string, sourceId: string) {
  const { authority, season, seasonInvalidated, seasonKey } =
    useCollectionSeason(seasonId);
  const client = useQueryClient();
  const sourceOptions = createCollectionQueries(authority).source(sourceId);
  const queryKey = sourceOptions.queryKey;
  const source = useQuery(sourceOptions);
  /** Cancels older reads before publishing the validated response and invalidating its season projections. */
  async function accept(value: SourceBindingResponse) {
    await client.cancelQueries({ queryKey, exact: true });
    if (!authority.session.isCurrent(authority.session.generation)) return;
    publishCollectionRevision(client, queryKey, value);
    invalidateSeasonPreparation(client, authority.session.generation, seasonId);
  }
  const candidate = useCommand(
    {
      mutationKey: [
        ...queryKey,
        ...getSetCollectionSourceCandidateMutationKey(),
      ],
      mutationFn: async (body: SetSourceCandidateRequest) =>
        setCollectionSourceCandidate(sourceId, body, await authority.request()),
      onSuccess: accept,
    },
    { groupKey: queryKey, requiresRead: requiresRevisionRead },
  );
  const validation = useCommand(
    {
      mutationKey: [
        ...queryKey,
        ...getRequestCollectionSourceValidationMutationKey(),
      ],
      mutationFn: async (body: RequestSourceValidationRequest) =>
        requestCollectionSourceValidation(
          sourceId,
          body,
          await authority.request(),
        ),
      onSuccess: accept,
    },
    { groupKey: queryKey, requiresRead: requiresRevisionRead },
  );
  const confirmation = useCommand(
    {
      mutationKey: [
        ...queryKey,
        ...getConfirmCollectionSourceSeasonMutationKey(),
      ],
      mutationFn: async (body: ConfirmSourceSeasonRequest) =>
        confirmCollectionSourceSeason(
          sourceId,
          body,
          await authority.request(),
        ),
      onSuccess: accept,
    },
    { groupKey: queryKey, requiresRead: requiresRevisionRead },
  );
  return {
    authority,
    season,
    seasonInvalidated,
    source,
    candidate,
    validation,
    confirmation,
    sourceKey: queryKey,
    seasonKey,
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
