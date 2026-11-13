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
import { useAdministrationCapabilities } from "@/features/access/api/use-administration-capabilities";
import { useOperationalVersionAdmission } from "@/features/access/operational-version-admission";
import { useAccountSession } from "@/features/accounts/current-account";
import { createCollectionQueries } from "./collection-queries";
import {
  invalidateCollectionControls,
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
  const sources = useQuery(
    createCollectionQueries(authority).sources(seasonId),
  );

  /** A confirmed creation has no complete season projection; invalidate its two owning reads. */
  function acceptCreatedSource() {
    invalidateSeasonPreparation(client, seasonId);
  }

  /** Refreshes source/season decisions and controls that a first launch can create. */
  function acceptLaunchedSources() {
    invalidateSeasonPreparation(client, seasonId);
    invalidateCollectionSeasons(client);
    invalidateCollectionControls(client, seasonId);
  }

  const create = useMutation({
    mutationKey: [...seasonKey, ...getCreateCollectionSourceMutationKey()],
    mutationFn: async (body: CreateSourceBindingRequest) =>
      createCollectionSource(seasonId, body, await authority.request()),
    onSuccess: acceptCreatedSource,
  });
  const launch = useMutation({
    mutationKey: [...seasonKey, ...getLaunchCollectionSourcesMutationKey()],
    mutationFn: async (body: LaunchCollectionSourcesRequest) =>
      launchCollectionSources(seasonId, body, await authority.request()),
    onSuccess: acceptLaunchedSources,
  });
  return {
    authority,
    season,
    sources,
    create,
    launch,
  };
}

/** Candidate commands use canonical generated decoders, with explicit status reads and no polling. */
export function useSourcePreparation(seasonId: string, sourceId: string) {
  const { authority, season } = useCollectionSeason(seasonId);
  const client = useQueryClient();
  const sourceOptions = createCollectionQueries(authority).source(sourceId);
  const queryKey = sourceOptions.queryKey;
  const source = useQuery(sourceOptions);

  /** Refreshes the original source and owning season after an accepted command. */
  function accept() {
    void client.invalidateQueries({ queryKey, exact: true });
    invalidateSeasonPreparation(client, seasonId);
  }

  const candidate = useMutation({
    mutationKey: [...queryKey, ...getSetCollectionSourceCandidateMutationKey()],
    mutationFn: async (body: SetSourceCandidateRequest) =>
      setCollectionSourceCandidate(sourceId, body, await authority.request()),
    onSuccess: accept,
  });
  const validation = useMutation({
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
  });
  const confirmation = useMutation({
    mutationKey: [
      ...queryKey,
      ...getConfirmCollectionSourceSeasonMutationKey(),
    ],
    mutationFn: async (body: ConfirmSourceSeasonRequest) =>
      confirmCollectionSourceSeason(sourceId, body, await authority.request()),
    onSuccess: accept,
  });
  return {
    authority,
    season,
    source,
    candidate,
    validation,
    confirmation,
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
