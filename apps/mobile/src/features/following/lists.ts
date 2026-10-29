import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import {
  followListKey,
  type FollowingOwner,
  type FollowingTarget,
} from "./api/following-keys";
import type { FollowListPage } from "./api/personal-queries";

/**
 * Applies a current F03 refusal to the exact followed identity in this owner's admission context.
 * Older continuations are cancelled before removing the card, without deleting its persisted relation
 * or keeping an unavailable placeholder. Other identities and server continuation remain unchanged.
 */
export async function removeUnavailableFollowTarget(
  client: QueryClient,
  owner: FollowingOwner,
  bypass: boolean,
  target: FollowingTarget,
) {
  const queryKey = followListKey(owner, target.type, {}, bypass).slice(0, -1);
  await client.cancelQueries({ queryKey }, { revert: false });
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
