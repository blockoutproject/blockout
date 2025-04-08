import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TeamInfoCard from '@/src/components/team/TeamInfoCard';
import TeamStatsCard from '@/src/components/team/TeamStatsCard';
import { Team } from '@/src/types/Team';
import { EntityType } from '@/src/types/User';
import { colors } from '@/src/constants/Colors';
import UsersApi from '@/src/api/UsersApi';
import { useUserContext } from '@/src/hooks/user/useUserContext';

type Props = {
    team: Team;
};

const TeamProfile: React.FC<Props> = ({ team }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const { customUser, refetch } = useUserContext();

    // Check si la team est déjà dans les favoris
    const isFollowing = useMemo(() => {
        if (!customUser || !customUser.favorites) return false;
        const isFav = customUser.favorites.some((fav) => team && fav.entity_id === team.id && fav.entity_type === EntityType.TEAM);
        return isFav;
    }, [customUser, team]);

    const handleFollowToggle = async () => {
        if (!customUser || isProcessing) return;
        setIsProcessing(true);
        try {
            console.log('-------------isFollowing', isFollowing);
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
                <TouchableOpacity
                    style={[
                        styles.followButton,
                        isFollowing && styles.followingButton, // bouton dark si déjà suivi
                    ]}
                    onPress={handleFollowToggle}
                    disabled={isProcessing}
                >
                    <Text
                        style={[
                            styles.followText,
                            isFollowing && styles.followingText, // texte blanc si déjà suivi
                        ]}
                    >
                        {isFollowing ? 'Suivie' : 'Suivre'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.iconCounter}>
                    <Ionicons
                        name="people-outline"
                        size={20}
                        color={colors.light}
                        style={{ marginRight: 4 }}
                    />
                    <Text style={styles.counterText}>{team.followers_count}</Text>
                </View>
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
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.green,
        borderWidth: 1,
        borderColor: colors.green,
        paddingVertical: 6,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginRight: 12,
    },
    followText: {
        color: colors.light,
        fontSize: 16,
        fontWeight: '600',
    },
    followingButton: {
        backgroundColor: colors.dark,
        borderWidth: 1,
        borderColor: colors.light,
    },
    followingText: {
        color: colors.light,
    },
    iconCounter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counterText: {
        color: colors.light,
        fontSize: 16,
    },
});

export default TeamProfile;