import {useCallback, useEffect, useState} from "react";
import {EnrichedPoolDTO} from "@/src/types/Pool";
import {EntityType} from "@/src/types/User";
import {useSession} from "@/src/shared/providers/SessionProvider";
import {useQueryClient} from "@tanstack/react-query";
import {useApis} from "@/src/shared/providers/ApiProvider";

export function usePoolFollowState(enrichedPool: EnrichedPoolDTO) {
  const {customUser, refetch} = useSession();
  const qc = useQueryClient();
  const {mobile} = useApis();

  const [isFollowing, setIsFollowing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!customUser?.favorites) return;
    setIsFollowing(
      customUser.favorites.some(
        (f) =>
          f.entityId === enrichedPool.id &&
          f.entityType === EntityType.POOL,
      ),
    );
  }, [customUser?.favorites, enrichedPool.id]);

  const poolKey = ["enrichedPools", enrichedPool.id] as const;

  const cachedPool =
    qc.getQueryData<EnrichedPoolDTO>(poolKey) ?? enrichedPool;

  const followersCount =
    cachedPool.followersCount ?? enrichedPool.followersCount ?? 0;

  const onToggleFollow = useCallback(async () => {
    if (!customUser || isProcessing) return;

    const next = !isFollowing;
    setIsProcessing(true);

    const prevPool =
      qc.getQueryData<EnrichedPoolDTO>(poolKey) ?? enrichedPool;

    const optimisticCount = Math.max(
      0,
      (prevPool.followersCount ?? 0) + (next ? 1 : -1),
    );

    qc.setQueryData<EnrichedPoolDTO>(poolKey, {
      ...prevPool,
      followersCount: optimisticCount,
    });

    setIsFollowing(next);

    try {
      if (next) {
        await mobile.users.follow(EntityType.POOL, enrichedPool.id);
      } else {
        await mobile.users.unfollow(EntityType.POOL, enrichedPool.id);
      }

      await refetch();
    } catch (e) {
      qc.setQueryData<EnrichedPoolDTO>(poolKey, prevPool);
      setIsFollowing(!next);
    } finally {
      setIsProcessing(false);
      qc.invalidateQueries({queryKey: poolKey});
    }
  }, [
    customUser,
    isProcessing,
    isFollowing,
    qc,
    enrichedPool,
    enrichedPool.id,
    mobile,
    refetch,
    poolKey,
  ]);

  return {isFollowing, isProcessing, followersCount, onToggleFollow};
}
