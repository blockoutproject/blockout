import { useEffect, useState } from "react";
import { EnrichedPoolDTO } from "@/src/types/Pool";
import UsersApi from "@/src/api/UsersApi";
import { EntityType } from "@/src/types/User";
import { useSession } from "@/src/context/SessionProvider";

export function usePoolFollowState(enrichedPool: EnrichedPoolDTO) {
    const { customUser, refetch } = useSession();
    const [followersCount, setFollowersCount] = useState(enrichedPool.followersCount);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    /* garde le compteur à jour si le pool change */
    useEffect(() => setFollowersCount(enrichedPool.followersCount), [enrichedPool.followersCount]);

    /* calcule le suivi courant */
    useEffect(() => {
        setIsFollowing(
            !!customUser?.favorites?.some(
                (f) => f.entityId === enrichedPool.id && f.entityType === EntityType.POOL,
            ),
        );
    }, [customUser, enrichedPool.id]);

    const onToggleFollow = async () => {
        if (!customUser || isProcessing) return;

        const next = !isFollowing;
        setIsFollowing(next);
        setFollowersCount((c) => c + (next ? 1 : -1));
        setIsProcessing(true);

        try {
            const api = UsersApi.getInstance();
            next
                ? await api.follow(EntityType.POOL, enrichedPool.id)
                : await api.unfollow(EntityType.POOL, enrichedPool.id);
            refetch();
        } catch {
            setIsFollowing(!next);
            setFollowersCount((c) => c + (next ? -1 : 1));
        } finally {
            setIsProcessing(false);
        }
    };

    return { isFollowing, isProcessing, followersCount, onToggleFollow };
}