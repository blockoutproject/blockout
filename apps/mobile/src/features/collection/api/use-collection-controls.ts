import {
  useInfiniteQuery,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createCollectionQueries } from "./collection-queries";
import {
  closeCollectionSeason,
  getCloseCollectionSeasonMutationKey,
  getGetCollectionSeasonQueryKey,
  getListCollectionControlsQueryKey,
  getListCollectionSeasonsQueryKey,
  getRequestCollectionMutationKey,
  getSetCollectionActivityMutationKey,
  requestCollection,
  setCollectionActivity,
} from "../../../../.generated/mobile";
import {
  CollectionControlResponse,
  type CloseCollectionSeasonRequest,
  type SetCollectionActivityRequest,
  type RequestCollectionRequest,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
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
  const saving = useIsMutating({ mutationKey: key }) > 0;
  const query = useQuery(controlOptions);
  const results = useInfiniteQuery(queries.results(controlId));
  /** Installs a confirmed command only when no same/newer revision was already read, preserving completion freshness. */
  async function accept(value: CollectionControlResponse) {
    await client.cancelQueries({ queryKey: key, exact: true });
    if (!authority.session.isCurrent(authority.session.generation))
      throw new ApiError("cancelled");
    client.setQueryData<CollectionControlResponse>(key, (current) =>
      current && current.revision >= value.revision ? current : value,
    );
    void client.invalidateQueries({
      queryKey: getSessionQueryKey(
        authority.session.generation,
        getListCollectionControlsQueryKey(seasonId ? { seasonId } : undefined),
      ),
      exact: true,
    });
    return value;
  }
  const activity = useMutation({
    mutationKey: [...key, ...getSetCollectionActivityMutationKey()],
    gcTime: 0,
    retry: false,
    mutationFn: async (body: SetCollectionActivityRequest) =>
      accept(
        await setCollectionActivity(controlId, body, await authority.request()),
      ),
  });
  const request = useMutation({
    mutationKey: [...key, ...getRequestCollectionMutationKey()],
    gcTime: 0,
    retry: false,
    // Orval's multi-success-status function supplies no decoder. Validate once at this consuming boundary.
    mutationFn: async (body: RequestCollectionRequest) =>
      accept(
        await requestCollection(controlId, body, {
          ...(await authority.request()),
          schema: CollectionControlResponse,
        }),
      ),
  });
  return { authority, query, results, activity, request, saving };
}

/** Exact terminal closure uses the existing season revision and never retries an uncertain acknowledgement. */
export function useCloseCollectionSeason(seasonId: string) {
  const { authority, season } = useCollectionSeason(seasonId);
  const client = useQueryClient();
  const key = getSessionQueryKey(
    authority.session.generation,
    getGetCollectionSeasonQueryKey(seasonId),
  );
  const saving = useIsMutating({ mutationKey: key }) > 0;
  const close = useMutation({
    mutationKey: [...key, ...getCloseCollectionSeasonMutationKey()],
    gcTime: 0,
    retry: false,
    mutationFn: async (body: CloseCollectionSeasonRequest) => {
      const accepted = await closeCollectionSeason(
        seasonId,
        body,
        await authority.request(),
      );
      await client.cancelQueries({ queryKey: key, exact: true });
      if (!authority.session.isCurrent(authority.session.generation))
        throw new ApiError("cancelled");
      client.setQueryData(key, accepted);
      void client.invalidateQueries({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getListCollectionSeasonsQueryKey(),
        ),
        exact: true,
      });
      void client.invalidateQueries({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getListCollectionControlsQueryKey({ seasonId }),
        ),
        exact: true,
      });
      return accepted;
    },
  });
  return { authority, season, close, saving };
}
