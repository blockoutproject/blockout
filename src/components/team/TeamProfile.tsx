import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import TeamInfoCard from '@/src/components/team/TeamInfoCard';
import { Team } from '@/src/types/Team';
import { EntityType } from '@/src/types/User';
import UsersApi from '@/src/api/UsersApi';
import { useUserContext } from '@/src/hooks/user/useUserContext';
import FollowButton from '../common/FollowButton';
import FollowersCounter from '../common/FollowersCount';
import { useAppTheme } from '@/src/context/ThemeProvider';

type Props = {
    team: Team;
};

const TeamProfile: React.FC<Props> = ({ team }) => {
    const { customUser, refetch } = useUserContext();
    const [isProcessing, setIsProcessing] = useState(false);
    const [followersCount, setFollowersCount] = useState(team.followersCount);
    const [isFollowing, setIsFollowing] = useState(false);
    const theme = useAppTheme();

    useEffect(() => {
        setFollowersCount(team.followersCount);
    }, [team.followersCount]);

    useEffect(() => {
        if (customUser?.favorites) {
            const isFav = customUser.favorites.some(
                (fav) => fav.entityId === team.id && fav.entityType === EntityType.TEAM
            );
            setIsFollowing(isFav);
        }
    }, [customUser, team.id]);

    const handleFollowToggle = async () => {
        if (!customUser || isProcessing) return;

        const newFollowState = !isFollowing;
        const newCount = newFollowState ? followersCount + 1 : followersCount - 1;

        setIsFollowing(newFollowState);
        setFollowersCount(newCount);
        setIsProcessing(true);

        try {
            if (newFollowState) {
                await UsersApi.getInstance().follow(EntityType.TEAM, team.id);
            } else {
                await UsersApi.getInstance().unfollow(EntityType.TEAM, team.id);
            }
            refetch();
        } catch (error) {
            console.error('Erreur follow/unfollow :', error);
            setIsFollowing(!newFollowState); // rollback follow state
            setFollowersCount(followersCount); // rollback followers count
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.profileRow}>
                <TeamInfoCard team={team} />
            </View>

            <View style={styles.actionsRow}>
                <FollowButton
                    isFollowing={isFollowing}
                    onPress={handleFollowToggle}
                    disabled={isProcessing}
                />
                <FollowersCounter count={followersCount} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
    },
    profileRow: {
        marginBottom: 10,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
});

export default TeamProfile;