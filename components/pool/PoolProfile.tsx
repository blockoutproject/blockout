import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pool } from '@/types/Pool';
import { colors } from '@/constants/Colors';
import { Image } from "expo-image";

type PoolProfileProps = {
    pool: Pool;
};

const PoolProfile: React.FC<PoolProfileProps> = ({ pool }) => {
    return (
        <View style={styles.container}>
            {/* Logo à gauche */}
            <Image
                source={require('../../assets/leagues/msl_profile.png')}
                style={styles.leagueLogo}
                contentFit="contain"
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
                    <TouchableOpacity style={styles.followButton}>
                        <Ionicons name="add" size={14} color={colors.light} style={{ marginRight: 4 }} />
                        <Text style={styles.followText}>Suivre</Text>
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
        fontSize: 18,
        fontWeight: '700',
        color: colors.light,
        marginBottom: 4,
    },
    leagueLink: {
        fontSize: 13,
        color: '#bbb',
        marginBottom: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2EA44F',
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