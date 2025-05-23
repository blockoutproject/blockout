import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pool } from '@/src/types/Pool';
import FastImage from 'react-native-fast-image';
import UsersApi from '@/src/api/UsersApi';
import { EntityType } from '@/src/types/User';
import { useUserContext } from '@/src/hooks/user/useUserContext';
import FollowButton from '../common/FollowButton';
import FollowersCounter from '../common/FollowersCount';
import { useAppTheme } from '@/src/context/ThemeProvider';

type PoolProfileProps = {
    pool: Pool;
};

const PoolProfile: React.FC<PoolProfileProps> = ({ pool }) => {
    const { customUser, refetch } = useUserContext();
    const [isProcessing, setIsProcessing] = useState(false);
    const [followersCount, setFollowersCount] = useState(pool.followersCount);
    const [isFollowing, setIsFollowing] = useState(false);
    const theme = useAppTheme();

    useEffect(() => {
        setFollowersCount(pool.followersCount);
    }, [pool.followersCount]);

    useEffect(() => {
        if (customUser?.favorites) {
            const isFav = customUser.favorites.some(
                (fav) => fav.entityId === pool.id && fav.entityType === EntityType.POOL
            );
            setIsFollowing(isFav);
        }
    }, [customUser, pool.id]);

    const handleFollowToggle = async () => {
        if (!customUser || isProcessing) return;

        const newFollowState = !isFollowing;
        const newCount = newFollowState ? followersCount + 1 : followersCount - 1;

        setIsFollowing(newFollowState);
        setFollowersCount(newCount);
        setIsProcessing(true);

        try {
            if (newFollowState) {
                await UsersApi.getInstance().follow(EntityType.POOL, pool.id);
            } else {
                await UsersApi.getInstance().unfollow(EntityType.POOL, pool.id);
            }
            refetch();
        } catch (error) {
            console.error('Erreur follow/unfollow :', error);
            setIsFollowing(!newFollowState);
            setFollowersCount(followersCount);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <FastImage
                source={require('@/assets/leagues/msl_profile.png')}
                style={styles.leagueLogo}
                resizeMode="contain"
            />
            <View style={styles.infoContainer}>
                <Text
                    style={[styles.leagueTitle, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {pool.name}
                </Text>
                <Text style={[styles.leagueLink, { color: theme.textInactive }]}>ligue-b-masculine.com</Text>

                <View style={styles.actionsRow}>
                    <FollowButton
                        isFollowing={isFollowing}
                        onPress={handleFollowToggle}
                        disabled={isProcessing}
                    />
                    <FollowersCounter count={followersCount} />
                </View>
            </View>
        </View>
    );
};

export default PoolProfile;

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 26,
        paddingVertical: 20,
        alignItems: 'flex-end',
    },
    leagueLogo: {
        width: 70,
        height: 126,
        borderRadius: 12,
        marginRight: 16,
    },
    infoContainer: {
        flex: 1,
    },
    leagueTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    leagueLink: {
        fontSize: 13,
        marginBottom: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});