import { publishCollectionRevision } from "./publish-collection-revision";
import {
  invalidateCollectionControls,
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
import {
  closeCollectionSeason,
  getCloseCollectionSeasonMutationKey,
  getGetCollectionSeasonQueryKey,
  getRequestCollectionMutationKey,
  getSetCollectionActivityMutationKey,
  requestCollection,
  setCollectionActivity,
} from "../../../../.generated/mobile";
import {
  CollectionControlResponse,
  type CloseCollectionSeasonRequest,
  type CollectionSeasonResponse,
  type SetCollectionActivityRequest,
  type RequestCollectionRequest,
} from "../../../../.generated/schemas/index.zod";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import {
  useCollectionAuthority,
  useCollectionSeason,
} from "./use-source-preparation";

/** Reads the complete controls for exactly one season, or the two seasonless families. */
export function useCollectionControls(seasonId?: string) {
  const authority = useCollectionAuthority();
  const query = useQuery(createCollectionQueries(authority).controls(seasonId));
  return { authority, query };
}

/** Current control, paged evidence and explicit commands share generated keys and the F05/F12 authority. */
export function useCollectionControl(controlId: string, seasonId?: string) {
  const authority = useCollectionAuthority();
  const client = useQueryClient();
  const queries = createCollectionQueries(authority);
  const controlOptions = queries.control(controlId);
  const key = controlOptions.queryKey;
  const query = useQuery(controlOptions);
  const results = useInfiniteQuery(queries.results(controlId));
  /** Installs a confirmed command only when no same/newer revision was already read, preserving completion freshness. */
  async function accept(value: CollectionControlResponse) {
    await client.cancelQueries({ queryKey: key, exact: true });
    if (!authority.session.isCurrent(authority.session.generation)) return;
    publishCollectionRevision(client, key, value);
    invalidateCollectionControls(
      client,
      authority.session.generation,
      seasonId,
    );
  }
  const activity = useCommand(
    {
      mutationKey: [...key, ...getSetCollectionActivityMutationKey()],
      mutationFn: async (body: SetCollectionActivityRequest) =>
        setCollectionActivity(controlId, body, await authority.request()),
      onSuccess: accept,
    },
    { groupKey: key, requiresRead: requiresRevisionRead },
  );
  const request = useCommand(
    {
      mutationKey: [...key, ...getRequestCollectionMutationKey()],
      // Orval's multi-success-status function supplies no decoder. Validate once at this consuming boundary.
      mutationFn: async (body: RequestCollectionRequest) =>
        requestCollection(controlId, body, {
          ...(await authority.request()),
          schema: CollectionControlResponse,
        }),
      onSuccess: accept,
    },
    { groupKey: key, requiresRead: requiresRevisionRead },
  );
  return {
    authority,
    query,
    results,
    activity,
    request,
    queryKey: key,
    seasonKey: seasonId
      ? getSessionQueryKey(
          authority.session.generation,
          getGetCollectionSeasonQueryKey(seasonId),
        )
      : undefined,
  };
}

/** Exact terminal closure uses the existing season revision and never retries an uncertain acknowledgement. */
export function useCloseCollectionSeason(seasonId: string) {
  const {
    authority,
    season,
    seasonInvalidated,
    seasonKey: key,
  } = useCollectionSeason(seasonId);
  const client = useQueryClient();
  /** Publishes the terminal lifecycle only for the originating session and preserves a newer observed revision. */
  async function accept(accepted: CollectionSeasonResponse) {
    await client.cancelQueries({ queryKey: key, exact: true });
    if (!authority.session.isCurrent(authority.session.generation)) return;
    publishCollectionRevision(client, key, accepted);
    invalidateCollectionSeasons(client, authority.session.generation);
    invalidateCollectionControls(
      client,
      authority.session.generation,
      seasonId,
    );
  }
  const close = useCommand(
    {
      mutationKey: [...key, ...getCloseCollectionSeasonMutationKey()],
      mutationFn: async (body: CloseCollectionSeasonRequest) =>
        closeCollectionSeason(seasonId, body, await authority.request()),
      onSuccess: accept,
    },
    { groupKey: key, requiresRead: requiresRevisionRead },
  );
  return { authority, season, seasonInvalidated, close, seasonKey: key };
}
