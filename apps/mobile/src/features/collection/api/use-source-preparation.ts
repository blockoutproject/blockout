import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  confirmCollectionSourceSeason,
  createCollectionSource,
  getConfirmCollectionSourceSeasonMutationKey,
  getCreateCollectionSourceMutationKey,
  getLaunchCollectionSourcesMutationKey,
  getRequestCollectionSourceValidationMutationKey,
  getSetCollectionSourceCandidateMutationKey,
  launchCollectionSources,
  requestCollectionSourceValidation,
  setCollectionSourceCandidate,
} from "../../../../.generated/mobile";
import type {
  ConfirmSourceSeasonRequest,
  CreateSourceBindingRequest,
  LaunchCollectionSourcesRequest,
  RequestSourceValidationRequest,
  SetSourceCandidateRequest,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { useAdministrationCapabilities } from "../../access/api/use-administration-capabilities";
import { useOperationalVersionAdmission } from "../../access/operational-version-admission";
import { useAccountSession } from "../../accounts/current-account";
import { createCollectionQueries } from "./collection-queries";
import {
  invalidateCollectionSeasons,
  invalidateSeasonPreparation,
} from "./invalidate-collection-reads";

/** Current F05 identity and F12 grant for collection requests; server authorization remains authoritative. */
export function useCollectionAuthority() {
  const session = useAccountSession();
  const capabilities = useAdministrationCapabilities();
  const version = useOperationalVersionAdmission();
  const enabled =
    capabilities.permissions?.manageCollection === true && version.satisfied;
  /** Supplies original-principal credentials; the server validates the action grant and revision. */
  async function request() {
    const credentials = await session.getCredentials();
    if (!credentials) throw new ApiError("http", 401);
    return {
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
  return { authority, season, seasonKey: options.queryKey };
}
/** Complete configuration reads and atomic selected-source launch; selection and drafts belong to the forms. */
export function useSeasonPreparation(seasonId: string) {
  const { authority, season, seasonKey } = useCollectionSeason(seasonId);
  const client = useQueryClient();
  const sourcesOptions = createCollectionQueries(authority).sources(seasonId);
  const sourcesKey = sourcesOptions.queryKey;
  const sources = useQuery(sourcesOptions);
  /** A confirmed creation has no complete season projection; invalidate its two owning reads. */
  function acceptCreatedSource() {
    invalidateSeasonPreparation(client, seasonId);
  }
  /** Refreshes the season and sources after the launch attempt settles. */
  function acceptLaunchedSources() {
    void client.invalidateQueries({ queryKey: seasonKey, exact: true });
    void client.invalidateQueries({ queryKey: sourcesKey, exact: true });
    invalidateCollectionSeasons(client);
  }
  const create = useMutation({
    retry: false,
    networkMode: "always",
    mutationKey: [...seasonKey, ...getCreateCollectionSourceMutationKey()],
    mutationFn: async (body: CreateSourceBindingRequest) =>
      createCollectionSource(seasonId, body, await authority.request()),
    onSettled: acceptCreatedSource,
  });
  const launch = useMutation({
    retry: false,
    networkMode: "always",
    mutationKey: [...seasonKey, ...getLaunchCollectionSourcesMutationKey()],
    mutationFn: async (body: LaunchCollectionSourcesRequest) =>
      launchCollectionSources(seasonId, body, await authority.request()),
    onSettled: acceptLaunchedSources,
  });
  return {
    authority,
    season,
    sources,
    create,
    launch,
    seasonKey,
    sourcesKey,
  };
}
/** Candidate commands use canonical generated decoders, with explicit status reads and no polling. */
export function useSourcePreparation(seasonId: string, sourceId: string) {
  const { authority, season, seasonKey } = useCollectionSeason(seasonId);
  const client = useQueryClient();
  const sourceOptions = createCollectionQueries(authority).source(sourceId);
  const queryKey = sourceOptions.queryKey;
  const source = useQuery(sourceOptions);
  /** Refreshes the original source and owning season after any explicit attempt. */
  function accept() {
    void client.invalidateQueries({ queryKey, exact: true });
    invalidateSeasonPreparation(client, seasonId);
  }
  const candidate = useMutation({
    retry: false,
    networkMode: "always",
    mutationKey: [...queryKey, ...getSetCollectionSourceCandidateMutationKey()],
    mutationFn: async (body: SetSourceCandidateRequest) =>
      setCollectionSourceCandidate(sourceId, body, await authority.request()),
    onSettled: accept,
  });
  const validation = useMutation({
    retry: false,
    networkMode: "always",
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
    onSettled: accept,
  });
  const confirmation = useMutation({
    retry: false,
    networkMode: "always",
    mutationKey: [
      ...queryKey,
      ...getConfirmCollectionSourceSeasonMutationKey(),
    ],
    mutationFn: async (body: ConfirmSourceSeasonRequest) =>
      confirmCollectionSourceSeason(sourceId, body, await authority.request()),
    onSettled: accept,
  });
  return {
    authority,
    season,
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
