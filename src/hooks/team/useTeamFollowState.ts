import { useEffect, useState } from 'react';
import { useUserContext } from '@/src/context/UserProvider';
import UsersApi from '@/src/api/UsersApi';
import { EntityType } from '@/src/types/User';
import { EnrichedTeamDTO, Team } from '@/src/types/Team';

export function useTeamFollowState(enrichedTeam: EnrichedTeamDTO) {
    const { customUser, refetch } = useUserContext();
    const [isProcessing, setIsProcessing] = useState(false);
    const [followersCount, setFollowersCount] = useState(enrichedTeam.followersCount);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        setFollowersCount(enrichedTeam.followersCount);
    }, [enrichedTeam.followersCount]);

    useEffect(() => {
        if (customUser?.favorites) {
            setIsFollowing(
                customUser.favorites.some(
                    (f) => f.entityId === enrichedTeam.id && f.entityType === EntityType.TEAM
                )
            );
        }
    }, [customUser, enrichedTeam.id]);

    const onToggleFollow = async () => {
        if (!customUser || isProcessing) return;

        const next = !isFollowing;
        setFollowersCount((prev) => prev + (next ? 1 : -1));
        setIsFollowing(next);
        setIsProcessing(true);

        try {
            const api = UsersApi.getInstance();
            if (next) {
                await api.follow(EntityType.TEAM, enrichedTeam.id);
            } else {
                await api.unfollow(EntityType.TEAM, enrichedTeam.id);
            }
            refetch();
        } catch (error) {
            setFollowersCount((prev) => prev + (isFollowing ? 1 : -1));
            setIsFollowing(!next);
        } finally {
            setIsProcessing(false);
        }
    };

    return { isFollowing, isProcessing, followersCount, onToggleFollow };
}