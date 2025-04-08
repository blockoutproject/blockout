import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TeamInfoCard from '@/src/components/team/TeamInfoCard';
import TeamStatsCard from '@/src/components/team/TeamStatsCard';
import { Team } from '@/src/types/Team';
import { EntityType } from '@/src/types/User';
import { colors } from '@/src/constants/Colors';
import UsersApi from '@/src/api/UsersApi';
import { useUserContext } from '@/src/hooks/user/useUserContext';
import FollowButton from '../common/FollowButton';
import FollowersCounter from '../common/FollowersCount';

type Props = {
    team: Team;
};

const TeamProfile: React.FC<Props> = ({ team }) => {
    const { customUser, refetch } = useUserContext();
    const [isProcessing, setIsProcessing] = useState(false);

    const [followersCount, setFollowersCount] = useState(team.followers_count);

    useEffect(() => {
        setFollowersCount(team.followers_count);
    }, [team.followers_count]);

    const initialIsFollowing = useMemo(() => {
        if (!customUser || !customUser.favorites) return false;
        const isFav = customUser.favorites.some((fav) => team && fav.entity_id === team.id && fav.entity_type === EntityType.TEAM);
        return isFav;
    }, [customUser, team]);

    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);

    const handleFollowToggle = async () => {
        if (!customUser || isProcessing) return;

        const newFollowState = !isFollowing;
        const newCount = newFollowState ? followersCount + 1 : followersCount - 1;

        setIsFollowing(newFollowState);
        setFollowersCount(newCount);
        setIsProcessing(true);
        try {
            if (isFollowing) {
                await UsersApi.getInstance().unfollow(EntityType.TEAM, team.id);
            } else {
                await UsersApi.getInstance().follow(EntityType.TEAM, team.id);
            }
            refetch();
        } catch (error) {
            console.error('Erreur follow/unfollow :', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <TeamInfoCard team={team} />

            <View style={{ position: 'absolute', right: 10, top: 5 }}>
                <TeamStatsCard team={team} />
            </View>
            
            <View style={styles.actionsRow}>
                <FollowButton
                    isFollowing={isFollowing}
                    onPress={handleFollowToggle}
                    disabled={isProcessing}
                />
                <FollowersCounter count={followersCount} />
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 10,
    },
});

export default TeamProfile;