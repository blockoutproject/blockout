import { useEffect, useMemo, useState } from 'react';
import UsersApi from '@/src/api/UsersApi';
import { EntityType } from '@/src/types/User';
import { EnrichedTeamDTO } from '@/src/types/Team';
import { useSession } from '@/src/context/SessionProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useEnrichedTeamById } from '@/src/hooks/team/useEnrichedTeamById';

export function useTeamFollowState(enrichedTeam: EnrichedTeamDTO) {
    const { customUser, refetch } = useSession();
    const qc = useQueryClient();

    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (customUser?.favorites) {
            setIsFollowing(
                customUser.favorites.some(
                    (f) => f.entityId === enrichedTeam.id && f.entityType === EntityType.TEAM
                )
            );
        }
    }, [customUser, enrichedTeam.id]);

    const { data: teamFromCache } = useEnrichedTeamById(enrichedTeam.id);
    const followersCount = teamFromCache?.followersCount ?? enrichedTeam.followersCount;

    const onToggleFollow = useMemo(
        () => async () => {
            if (!customUser || isProcessing) return;

            const next = !isFollowing;
            setIsProcessing(true);

            const teamKey = ['enrichedTeams', enrichedTeam.id] as const;

            const prevTeam = qc.getQueryData<EnrichedTeamDTO | null>(teamKey) ?? enrichedTeam;

            const nextCount =
                Math.max(0, (prevTeam.followersCount ?? 0) + (next ? 1 : -1));
            qc.setQueryData<EnrichedTeamDTO>(teamKey, { ...prevTeam, followersCount: nextCount });

            setIsFollowing(next);

            try {
                const api = UsersApi.getInstance();
                if (next) {
                    await api.follow(EntityType.TEAM, enrichedTeam.id);
                } else {
                    await api.unfollow(EntityType.TEAM, enrichedTeam.id);
                }

                refetch?.();
            } catch (error) {
                qc.setQueryData<EnrichedTeamDTO>(teamKey, prevTeam);
                setIsFollowing(!next);
            } finally {
                setIsProcessing(false);
                qc.invalidateQueries({ queryKey: teamKey });
            }
        },
        [customUser, isProcessing, isFollowing, qc, enrichedTeam.id, enrichedTeam, refetch]
    );

    return { isFollowing, isProcessing, followersCount, onToggleFollow };
}