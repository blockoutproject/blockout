import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors } from '@/src/constants/Colors';
import { useDetailedTeamsByPool } from '@/src/hooks/pool/useDetailedTeamsByPool';
import FastImage from 'react-native-fast-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface RankingCardProps {
    poolId: number;
    scrollable?: boolean;
}

const rankColors = {
    first: '#cf9802',
    second: '#bfbfbf',
    third: '#bc702a',
    last: '#e51b1b',
    default: '#5d5d5d',
};

function getRankColor(rank: number, length: number): string {
    if (rank === 1) return rankColors.first;
    if (rank === 2) return rankColors.second;
    if (rank === 3) return rankColors.third;
    if (rank === length) return rankColors.last;
    return rankColors.default;
}

function getRankBackground(isEven: boolean): string {
    return isEven ? colors.dark : 'transparent';
}

const RankingCard: React.FC<RankingCardProps> = ({ poolId, scrollable = true }) => {
    const router = useRouter();
    const { teams, isLoading, isError } = useDetailedTeamsByPool(poolId);

    const handleTeamPress = (teamId: number) => {
        router.push(`/team/${teamId}`);
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={colors.light} />
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
        <LinearGradient
            colors={[colors.dark, colors.grey]}
            start={{ x: 0, y: 2.5 }}
            end={{ x: 0, y: 0 }}
            style={styles.container}
        >
            {/* HEADER */}
            <View style={styles.headerRow}>
                <View style={styles.transparentRankIndicator} />
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
                    b.points - a.points ||
                    a.pointsPenalty - b.pointsPenalty ||
                    b.wins - a.wins ||
                    b.coefSets - a.coefSets ||
                    b.coefPoints - a.coefPoints
                )}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={scrollable}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => {
                    const rank = index + 1;
                    const isEven = index % 2 === 0;

                    return (
                        <View style={[styles.row, { backgroundColor: getRankBackground(isEven) }]}>
                            <View
                                style={[
                                    styles.rankIndicator,
                                    { backgroundColor: getRankColor(rank, teams.length) },
                                ]}
                            />
                            <Text
                                style={[styles.cell, styles.rankCell]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {rank}
                            </Text>
                            <TouchableOpacity
                                style={[styles.teamCell, styles.teamContainer]}
                                onPress={() => handleTeamPress(item.id)}
                            >
                                <FastImage
                                    source={require("@/assets/clubs/paris_volley.png")}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                                <Text
                                    style={styles.name}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.9}
                                >
                                    {item.shortName}
                                </Text>
                            </TouchableOpacity>
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
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 8,
        paddingTop: -8,
        borderRadius: 12,
    },
    loadingText: {
        color: colors.light,
        marginTop: 8,
    },
    errorText: {
        color: colors.red,
    },
    headerRow: {
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
    },
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
    transparentRankIndicator: {
        width: 5,
        height: '85%',
        borderRadius: 2,
        marginRight: 16,
        backgroundColor: 'transparent',
    },
    headerText: {
        color: colors.light,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    cell: {
        color: colors.light,
        fontSize: 16,
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
    teamContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        color: colors.light,
        marginLeft: 8,
        marginRight: 24,
        fontSize: 14,
    },
    logo: {
        width: 30,
        height: 30,
    },
});

export default RankingCard;