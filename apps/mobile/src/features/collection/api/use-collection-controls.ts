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
  type CollectionControlListResponse,
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
} from "./use-collection-season";

/** Reads the complete controls for exactly one season, or the two seasonless families. */
export function useCollectionControls(seasonId?: string) {
  const authority = useCollectionAuthority();
  const options = createCollectionQueries(authority).controls(seasonId);
  const query = useQuery(options);
  return { authority, query, queryKey: options.queryKey };
}

/** Direct commands update the accepted row in its complete scope projection. */
export function useCollectionControl(
  controlId: string,
  { authority, query, queryKey }: ReturnType<typeof useCollectionControls>,
) {
  const client = useQueryClient();

  /** The target acknowledgment cannot turn a failed list read into a successful one. */
  function acceptResponse(accepted: CollectionControlResponse) {
    if (client.getQueryState(queryKey)?.status === "success") {
      client.setQueryData<CollectionControlListResponse>(
        queryKey,
        (current) => {
          if (!current?.items.some((control) => control.id === controlId)) {
            return undefined;
          }
          return {
            ...current,
            items: current.items.map((control) =>
              control.id === controlId ? accepted : control,
            ),
          };
        },
      );
    }
    void client.invalidateQueries({ queryKey, exact: true });
  }

  const activity = useMutation({
    mutationKey: [
      ...queryKey,
      controlId,
      ...getSetCollectionActivityMutationKey(),
    ],
    mutationFn: async (body: SetCollectionActivityRequest) =>
      setCollectionActivity(controlId, body, await authority.request()),
    onSuccess: acceptResponse,
  });
  const request = useMutation({
    mutationKey: [...queryKey, controlId, ...getRequestCollectionMutationKey()],
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
