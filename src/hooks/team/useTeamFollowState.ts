import { useEffect, useState } from 'react';
import { useUserContext } from '@/src/hooks/user/useUserContext';
import UsersApi from '@/src/api/UsersApi';
import { EntityType } from '@/src/types/User';
import { Team } from '@/src/types/Team';

export function useTeamFollowState(team: Team) {
    const { customUser, refetch } = useUserContext();
    const [isProcessing, setIsProcessing] = useState(false);
    const [followersCount, setFollowersCount] = useState(team.followersCount);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        setFollowersCount(team.followersCount);
    }, [team.followersCount]);

    useEffect(() => {
        if (customUser?.favorites) {
            setIsFollowing(
                customUser.favorites.some(
                    (f) => f.entityId === team.id && f.entityType === EntityType.TEAM
                )
            );
        }
    }, [customUser, team.id]);

    const onToggleFollow = async () => {
        if (!customUser || isProcessing) return;

        const next = !isFollowing;
        setFollowersCount((prev) => prev + (next ? 1 : -1));
        setIsFollowing(next);
        setIsProcessing(true);

        try {
            const api = UsersApi.getInstance();
            if (next) {
                await api.follow(EntityType.TEAM, team.id);
            } else {
                await api.unfollow(EntityType.TEAM, team.id);
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