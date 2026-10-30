import {
  hashKey,
  type InfiniteData,
  type QueryClient,
  type QueryFilters,
  type QueryKey,
} from "@tanstack/react-query";
import {
  followListKey,
  type FollowingOwner,
  type FollowingTarget,
} from "./api/following-keys";
import type { FollowListPage } from "./api/personal-queries";

/**
 * Applies a current F03 refusal to the exact followed identity in this owner's admission context.
 * Older continuations are cancelled before removing the card, without deleting its persisted relation
 * or keeping an unavailable placeholder. Initial reads without accepted data retain explicit retry;
 * other identities and server continuation remain unchanged.
 */
export async function removeUnavailableFollowTarget(
  client: QueryClient,
  owner: FollowingOwner,
  bypass: boolean,
  target: FollowingTarget,
) {
  const queryKey = followListKey(owner, target.type, {}, bypass).slice(0, -1);
  await cancelFollowReads(client, { queryKey });
  for (const query of client.getQueryCache().findAll({ queryKey })) {
    const data = client.getQueryData<InfiniteData<FollowListPage>>(
      query.queryKey,
    );
    if (!data) continue;
    query.setState({
      data: {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.filter(
            (summary) =>
              ("team" in summary
                ? summary.team.id
                : summary.pool.id
              ).toLowerCase() !== target.id.toLowerCase(),
          ),
        })),
      },
    });
  }
}

/**
 * Applies established category-independent absence to overlapping retained lists.
 * A selected-season absence only removes that season from All seasons; an unrestricted absence
 * empties every selection. Native cancellation restores accepted state before applying this truth;
 * cancelled initial reads remain ordinary errors with explicit retry instead of idle pending state.
 */
export async function withdrawUnavailableFollowLists(
  client: QueryClient,
  owner: FollowingOwner,
  bypass: boolean,
  seasonId: string | undefined,
  currentKey?: QueryKey,
) {
  for (const resource of ["team", "pool"] as const) {
    const queryKey = followListKey(owner, resource, {}, bypass).slice(0, -1);
    /** The canonical generated trailing selection scopes each retained traversal. */
    const selectedSeason = (key: readonly unknown[]) =>
      (key.at(-1) as { seasonId?: string }).seasonId;
    const filters = {
      queryKey,
      predicate: (query: { queryKey: readonly unknown[] }) =>
        seasonId === undefined ||
        selectedSeason(query.queryKey) === undefined ||
        selectedSeason(query.queryKey) === seasonId,
    };
    await cancelFollowReads(client, {
      ...filters,
      predicate: (query) =>
        filters.predicate(query) &&
        (currentKey === undefined || query.queryHash !== hashKey(currentKey)),
    });
    for (const query of client.getQueryCache().findAll(filters)) {
      const data = client.getQueryData<InfiniteData<FollowListPage>>(
        query.queryKey,
      );
      if (!data) continue;
      const empty =
        seasonId === undefined || selectedSeason(query.queryKey) === seasonId;
      query.setState({
        ...(empty ? { status: "success" as const, error: null } : {}),
        data: {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: empty
              ? []
              : page.items.filter((item) => item.season.id !== seasonId),
            ...(empty ? { nextPage: undefined } : {}),
          })),
        },
      });
    }
  }
}

/** Restores accepted pages, but lets native cancellation expose retry when no prior page exists. */
async function cancelFollowReads(client: QueryClient, filters: QueryFilters) {
  await Promise.all(
    client
      .getQueryCache()
      .findAll(filters)
      .map((query) =>
        client.cancelQueries(
          { queryKey: query.queryKey, exact: true },
          { revert: query.state.data !== undefined },
        ),
      ),
  );
}
