import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeCollectionSeason,
  getCloseCollectionSeasonMutationKey,
  getRequestCollectionMutationKey,
  getSetCollectionActivityMutationKey,
  requestCollection,
  setCollectionActivity,
} from "../../../../.generated/mobile";
import {
  CollectionControlResponse,
  type CloseCollectionSeasonRequest,
  type SetCollectionActivityRequest,
} from "../../../../.generated/schemas/index.zod";
import { createCollectionQueries } from "./collection-queries";
import {
  invalidateCollectionControls,
  invalidateCollectionSeasons,
} from "./invalidate-collection-reads";
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

/** Current control and explicit commands share generated keys and the F05/F12 authority. */
export function useCollectionControl(controlId: string, seasonId?: string) {
  const authority = useCollectionAuthority();
  const client = useQueryClient();
  const queries = createCollectionQueries(authority);
  const controlOptions = queries.control(controlId);
  const key = controlOptions.queryKey;
  const query = useQuery(controlOptions);

  /** An acknowledged command cannot revive withdrawn data. */
  function acceptResponse(accepted: CollectionControlResponse) {
    client.setQueryData<CollectionControlResponse>(key, (current) =>
      current ? accepted : current,
    );
    void client.invalidateQueries({ queryKey: key, exact: true });
    invalidateCollectionControls(client, seasonId);
    invalidateCollectionSeasons(client);
  }

  const activity = useMutation({
    mutationKey: [...key, ...getSetCollectionActivityMutationKey()],
    mutationFn: async (body: SetCollectionActivityRequest) =>
      setCollectionActivity(controlId, body, await authority.request()),
    onSuccess: acceptResponse,
  });
  const request = useMutation({
    mutationKey: [...key, ...getRequestCollectionMutationKey()],
    // Orval's multi-success-status function supplies no decoder. Validate once at this consuming boundary.
    mutationFn: async () =>
      requestCollection(controlId, {
        ...(await authority.request()),
        schema: CollectionControlResponse,
      }),
    onSuccess: acceptResponse,
  });
  return {
    authority,
    query,
    activity,
    request,
  };
}

/** Exact terminal closure targets its original season and never retries an uncertain acknowledgement. */
export function useCloseCollectionSeason(seasonId: string) {
  const { authority, season, seasonKey: key } = useCollectionSeason(seasonId);
  const client = useQueryClient();

  /** Invalidates the season and its related controls after accepted closure. */
  function accept() {
    void client.invalidateQueries({ queryKey: key, exact: true });
    invalidateCollectionControls(client, seasonId);
    invalidateCollectionSeasons(client);
  }

  const close = useMutation({
    mutationKey: [...key, ...getCloseCollectionSeasonMutationKey()],
    mutationFn: async (body: CloseCollectionSeasonRequest) =>
      closeCollectionSeason(seasonId, body, await authority.request()),
    onSuccess: accept,
  });
  return { authority, season, close };
}
