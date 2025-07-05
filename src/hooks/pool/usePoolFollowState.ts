import { useEffect, useState } from "react";
import { Pool } from "@/src/types/Pool";
import { useUserContext } from "@/src/context/UserProvider";
import UsersApi from "@/src/api/UsersApi";
import { EntityType } from "@/src/types/User";

export function usePoolFollowState(pool: Pool) {
    const { customUser, refetch } = useUserContext();
    const [followersCount, setFollowersCount] = useState(pool.followersCount);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    /* garde le compteur à jour si le pool change */
    useEffect(() => setFollowersCount(pool.followersCount), [pool.followersCount]);

    /* calcule le suivi courant */
    useEffect(() => {
        setIsFollowing(
            !!customUser?.favorites?.some(
                (f) => f.entityId === pool.id && f.entityType === EntityType.POOL,
            ),
        );
    }, [customUser, pool.id]);

    const onToggleFollow = async () => {
        if (!customUser || isProcessing) return;

        const next = !isFollowing;
        setIsFollowing(next);
        setFollowersCount((c) => c + (next ? 1 : -1));
        setIsProcessing(true);

        try {
            const api = UsersApi.getInstance();
            next
                ? await api.follow(EntityType.POOL, pool.id)
                : await api.unfollow(EntityType.POOL, pool.id);
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