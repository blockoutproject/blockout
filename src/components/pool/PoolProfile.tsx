import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pool } from '@/src/types/Pool';
import { colors } from '@/src/constants/Colors';
import FastImage from 'react-native-fast-image'
import UsersApi from '@/src/api/UsersApi';
import { useUser } from '@/src/hooks/user/useUser';
import { EntityType } from '@/src/types/User';
import { useUserContext } from '@/src/context/UserProvider';

type PoolProfileProps = {
    pool: Pool;
};

const PoolProfile: React.FC<PoolProfileProps> = ({ pool }) => {
    const { user, isLoading } = useUserContext();
    const { data: userData, refetch } = useUser();
    const [isProcessing, setIsProcessing] = useState(false);

    // Check si la pool est déjà dans les favoris
    const isFollowing = useMemo(() => {
        if (!user || !user.favorites) return false;
        console.log(" -------- User dans isFollowing : ", user);
        const isFav = user.favorites.some((fav) => fav.entity_id === pool.id && fav.entity_type === EntityType.POOL);
        return isFav;
    }, [user, pool.id]);

    const handleFollowToggle = async () => {
        if (!user || isProcessing) return;
        setIsProcessing(true);
        try {
            console.log('Toggle follow for pool:', pool.id, isFollowing);
            if (isFollowing) {
                await UsersApi.getInstance().unfollow(EntityType.POOL, pool.id);
            } else {
                await UsersApi.getInstance().follow(EntityType.POOL, pool.id);
            }
            await refetch();
        } catch (error) {
            console.error('Erreur follow/unfollow :', error);
        } finally {
            setIsProcessing(false);
        }
    };
    return (
        <View style={styles.container}>
            {/* Logo à gauche */}
            <FastImage
                source={require('@/assets/leagues/msl_profile.png')}
                style={styles.leagueLogo}
                resizeMode="contain"
            />

            {/* Bloc d'infos à droite */}
            <View style={styles.infoContainer}>
                {/* Titre */}
                <Text style={styles.leagueTitle}>{pool.pool_name}</Text>

                {/* Lien */}
                <Text style={styles.leagueLink}>ligue-b-masculine.com</Text>

                {/* Ligne de boutons/actions */}
                <View style={styles.actionsRow}>
                    {/* Bouton "Suivre" */}
                    <TouchableOpacity style={styles.followButton} onPress={handleFollowToggle} disabled={isProcessing}>
                        <Ionicons
                            name={isFollowing ? 'remove' : 'add'}
                            size={14}
                            color={colors.light}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={styles.followText}>
                            {isFollowing ? 'Ne plus suivre' : 'Suivre'}
                        </Text>
                    </TouchableOpacity>

                    {/* Icône + compteur */}
                    <View style={styles.iconCounter}>
                        <Ionicons name="people-outline" size={18} color={colors.light} style={{ marginRight: 4 }} />
                        <Text style={styles.counterText}>156</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',         // Pour mettre l'image et le bloc à côté
        backgroundColor: colors.dark,
        paddingHorizontal: 26,
        paddingVertical: 20,
        alignItems: 'flex-end',         // Aligne verticalement l’image et le contenu
    },
    leagueLogo: {
        width: 70,
        height: 126, 
        borderRadius: 12,
        marginRight: 16,

    },
    infoContainer: {
        flex: 1,                      // Permet au bloc de prendre toute la place restante
    },
    leagueTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.light,
        marginBottom: 4,
    },
    leagueLink: {
        fontSize: 13,
        color: colors.inactive,
        marginBottom: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.green,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginRight: 12,
    },
    followText: {
        color: colors.light,
        fontSize: 14,
        fontWeight: '600',
    },
    iconCounter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counterText: {
        color: colors.light,
        fontSize: 14,
    },
});

export default PoolProfile;