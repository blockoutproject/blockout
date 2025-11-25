import { useCallback, useEffect, useState } from "react";
import { EntityType } from "@/src/types/User";
import { EnrichedTeamDTO } from "@/src/types/Team";
import { useSession } from "@/src/context/SessionProvider";
import { useQueryClient } from "@tanstack/react-query";
import { useApis } from "@/src/context/ApiProvider";

export function useTeamFollowState(enrichedTeam: EnrichedTeamDTO) {
    const { customUser, refetch } = useSession();
    const { mobile } = useApis();
    const qc = useQueryClient();

    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!customUser?.favorites) return;
        setIsFollowing(
            customUser.favorites.some(
                (f) =>
                    f.entityId === enrichedTeam.id &&
                    f.entityType === EntityType.TEAM,
            ),
        );
    }, [customUser?.favorites, enrichedTeam.id]);

    const teamKey = ["enrichedTeams", enrichedTeam.id] as const;

    const cachedTeam =
        qc.getQueryData<EnrichedTeamDTO>(teamKey) ?? enrichedTeam;

    const followersCount =
        cachedTeam.followersCount ?? enrichedTeam.followersCount ?? 0;

    const onToggleFollow = useCallback(async () => {
        if (!customUser || isProcessing) return;

        const next = !isFollowing;
        setIsProcessing(true);

        const prevTeam =
            qc.getQueryData<EnrichedTeamDTO>(teamKey) ?? enrichedTeam;

        const optimisticCount = Math.max(
            0,
            (prevTeam.followersCount ?? 0) + (next ? 1 : -1),
        );

        qc.setQueryData<EnrichedTeamDTO>(teamKey, {
            ...prevTeam,
            followersCount: optimisticCount,
        });

        setIsFollowing(next);

        try {
            if (next) {
                await mobile.follow(EntityType.TEAM, enrichedTeam.id);
            } else {
                await mobile.unfollow(EntityType.TEAM, enrichedTeam.id);
            }

            await refetch();
        } catch (e) {
            qc.setQueryData<EnrichedTeamDTO>(teamKey, prevTeam);
            setIsFollowing(!next);
        } finally {
            setIsProcessing(false);
            qc.invalidateQueries({ queryKey: teamKey });
        }
    }, [
        customUser,
        isProcessing,
        isFollowing,
        qc,
        enrichedTeam,
        enrichedTeam.id,
        mobile,
        refetch,
        teamKey,
    ]);

    return { isFollowing, isProcessing, followersCount, onToggleFollow };
}