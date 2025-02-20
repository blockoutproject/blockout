import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, Image } from 'react-native';
import { useDetailedPoolTeams } from '@/hooks/pool/usePoolWithTeams';

interface RankingCardProps {
    poolId: number;
}

function getRankColor(rank: number, length: number): string {
    switch (rank) {
        case 1:
            return '#f1c40f';
        case 2:
            return '#bfbfbf';
        case 3:
            return '#bc702a';
        case length:
            return '#e51b1b';
        case length - 1:
            return '#e51b1b';
        default:
            return '#5d5d5d';
    }
}

const RankingCard: React.FC<RankingCardProps> = ({ poolId }) => {
    const { teams, isLoading, isError } = useDetailedPoolTeams(poolId);
    console.log("RankingCard", teams);
    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Chargement du classement...</Text>
            </View>
        );
    }

    if (isError || !teams) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Erreur lors du chargement du classement.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>

            {/* HEADER */}
            <View style={[styles.row, styles.headerRow]}>
                {/* Barrette à gauche du header (on peut laisser transparent) */}
                <View style={[styles.rankIndicator, { backgroundColor: 'transparent' }]} />
                <Text style={[styles.headerText, styles.rankCell]} numberOfLines={1}>#</Text>
                <Text style={[styles.headerText, styles.teamCell]} numberOfLines={1}>Team</Text>
                <Text style={[styles.headerText, styles.statCell]} numberOfLines={1}>MJ</Text>
                <Text style={[styles.headerText, styles.statCell]} numberOfLines={1}>V</Text>
                <Text style={[styles.headerText, styles.statCell]} numberOfLines={1}>D</Text>
                <Text style={[styles.headerText, styles.statCell]} numberOfLines={1}>PTS</Text>
            </View>

            {/* LISTE DES ÉQUIPES */}
            <FlatList
                data={teams.sort((a, b) => 
                    b.points - a.points || // Tri par points
                    a.points_penalty - b.points_penalty || // Tri par matchs joués
                    b.wins - a.wins || // Tri par victoires
                    b.coef_sets - a.coef_sets || // Tri par coef sets
                    b.coef_points - a.coef_points // Tri par coef points
                )}    
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                renderItem={({ item, index }) => {
                    const rank = index + 1;
                    // On alterne la couleur de fond : index pair -> plus clair, index impair -> plus sombre
                    const backgroundColor = index % 2 === 0 ? '#111' : '#1C1C1E';

                    return (
                        <View style={[styles.row, { backgroundColor }]}>
                            {/* Barre colorée à gauche */}
                            <View
                                style={[
                                    styles.rankIndicator,
                                    { backgroundColor: getRankColor(rank, teams.length) },
                                ]}
                            />
                            {/* Rang */}
                            <Text
                                style={[styles.cell, styles.rankCell]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {rank}
                            </Text>

                            {/* Logo + Nom de l'équipe */}
                            <View style={[styles.teamCell, styles.teamContainer]}>
                                {/* Logo : remplace si besoin par un logo dynamique */}
                                <Image
                                    source={require("@/assets/clubs/paris_volley.png")}
                                    style={styles.logo}
                                />
                                <Text
                                    style={styles.name}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {item.short_name}
                                </Text>
                            </View>

                            {/* MJ, V, D, PTS */}
                            <Text style={[styles.cell, styles.statCell]}>
                                {item.played}
                            </Text>
                            <Text style={[styles.cell, styles.statCell]}>
                                {item.wins}
                            </Text>
                            <Text style={[styles.cell, styles.statCell]}>
                                {item.losses}
                            </Text>
                            <Text style={[styles.cell, styles.statCell]}>
                                {item.points}
                            </Text>
                        </View>
                    );
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        borderWidth: 8,
        borderTopWidth: -6,
        borderColor: '#1C1C1E',
        overflow: 'hidden', 
    },
    loadingText: {
        color: '#fff',
        marginTop: 8,
    },
    errorText: {
        color: 'red',
    },

    /** HEADER **/
    headerRow: {
        backgroundColor: '#1C1C1E',
        height: 45,
        flexDirection: 'row',
        alignItems: 'center',
    },

    /** LIGNES DU TABLEAU **/
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 4,
        height: 50,
    },
    rankIndicator: {
        width: 5,
        height: '85%',
        borderRadius: 2,
        marginRight: 16,
    },

    /** TEXTES **/
    headerText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    cell: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
    },
    rankCell: {
        flex: 0.4,
        textAlign: 'left',
    },
    teamCell: {
        flex: 2.5,
        textAlign: 'left',
    },
    statCell: {
        flex: 0.5,
    },

    /** CONTENU DE LA COLONNE ÉQUIPE (logo + nom) **/
    teamContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        color: '#fff',
        marginLeft: 8,
        marginRight: 24,
        fontSize: 14,
    },
    logo: {
        width: 25,
        height: 25,
        resizeMode: 'contain',
    },
});

export default RankingCard;