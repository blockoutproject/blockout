import { useEffect, useMemo, useState } from "react";
import { EnrichedPoolDTO } from "@/src/types/Pool";
import { EntityType } from "@/src/types/User";
import { useSession } from "@/src/context/SessionProvider";
import { useQueryClient } from "@tanstack/react-query";
import { useEnrichedPoolById } from "./useEnrichedPoolById";
import { useApis } from "@/src/context/ApiProvider";

export function usePoolFollowState(enrichedPool: EnrichedPoolDTO) {
    const { customUser, refetch } = useSession();
    const qc = useQueryClient();
    const { mobile } = useApis();

    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: poolFromCache } = useEnrichedPoolById(enrichedPool.id, false);
    const followersCount = poolFromCache?.followersCount ?? enrichedPool.followersCount;

    useEffect(() => {
        setIsFollowing(
            !!customUser?.favorites?.some(
                (f) => f.entityId === enrichedPool.id && f.entityType === EntityType.POOL
            )
        );
    }, [customUser, enrichedPool.id]);

    const onToggleFollow = useMemo(
        () => async () => {
            if (!customUser || isProcessing) return;

            const next = !isFollowing;
            setIsProcessing(true);

            const poolKey = ["enrichedPools", enrichedPool.id] as const;

            const prevPool =
                qc.getQueryData<EnrichedPoolDTO | null>(poolKey) ?? enrichedPool;

            const nextCount = Math.max(
                0,
                (prevPool.followersCount ?? 0) + (next ? 1 : -1)
            );
            qc.setQueryData<EnrichedPoolDTO>(poolKey, {
                ...prevPool,
                followersCount: nextCount,
            });

            setIsFollowing(next);

            try {
                if (next) {
                    await mobile.follow(EntityType.POOL, enrichedPool.id);
                } else {
                    await mobile.unfollow(EntityType.POOL, enrichedPool.id);
                }
                refetch();
            } catch {
                qc.setQueryData<EnrichedPoolDTO>(poolKey, prevPool);
                setIsFollowing(!next);
            } finally {
                setIsProcessing(false);
            }
        },
        [customUser, isProcessing, isFollowing, qc, enrichedPool, refetch]
    );

    return { isFollowing, isProcessing, followersCount, onToggleFollow };
}