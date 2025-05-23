import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useDetailedTeamsByPool } from '@/src/hooks/pool/useDetailedTeamsByPool';
import FastImage from 'react-native-fast-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { AppTheme } from '@/src/types/Theme';
import GradientView from './GradientView';

interface RankingCardProps {
    poolId: number;
    scrollable?: boolean;
}

const rankColors = (theme: any) => ({
    first: theme.gold,
    second: theme.silver,
    third: theme.bronze,
    last: theme.error,
    default: theme.textInactive,
});

function getRankColor(rank: number, theme: AppTheme): string {
    if (rank === 1) return theme.gold;
    if (rank === 2) return theme.silver;
    if (rank === 3) return theme.bronze;
    return theme.surfaceTertiary;
}

function getRankBackground(isEven: boolean, theme: any): string {
    return isEven ? theme.backgroundSecondary : 'transparent';
}

const RankingCard: React.FC<RankingCardProps> = ({ poolId, scrollable = true }) => {
    const router = useRouter();
    const { teams, isLoading, isError } = useDetailedTeamsByPool(poolId);
    const theme = useAppTheme();

    const handleTeamPress = (teamId: number) => {
        router.push(`/team/${teamId}`);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.text} />
                <Text style={[styles.loadingText, { color: theme.text }]}>Chargement du classement...</Text>
            </View>
        );
    }

    if (isError || !teams) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <Text style={[styles.errorText, { color: theme.error }]}>Erreur lors du chargement du classement.</Text>
            </View>
        );
    }

    return (
        <GradientView
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            {/* HEADER */}
            <View style={styles.headerRow}>
                <View style={styles.transparentRankIndicator} />
                <Text style={[styles.headerText, styles.rankCell, { color: theme.text }]} numberOfLines={1}>#</Text>
                <Text style={[styles.headerText, styles.teamCell, { color: theme.text }]} numberOfLines={1}>Team</Text>
                <Text style={[styles.headerText, styles.statCell, { color: theme.text }]} numberOfLines={1}>MJ</Text>
                <Text style={[styles.headerText, styles.statCell, { color: theme.text }]} numberOfLines={1}>V</Text>
                <Text style={[styles.headerText, styles.statCell, { color: theme.text }]} numberOfLines={1}>D</Text>
                <Text style={[styles.headerText, styles.statCell, { color: theme.text }]} numberOfLines={1}>PTS</Text>
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
                        <View style={[styles.row, { backgroundColor: getRankBackground(isEven, theme) }]}>
                            <View
                                style={[
                                    styles.rankIndicator,
                                    { backgroundColor: getRankColor(rank, theme) },
                                ]}
                            />
                            <Text
                                style={[styles.cell, styles.rankCell, { color: theme.text }]}
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
                                    style={[styles.name, { color: theme.text }]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.9}
                                >
                                    {item.shortName}
                                </Text>
                            </TouchableOpacity>
                            <Text style={[styles.cell, styles.statCell, { color: theme.text }]}>
                                {item.played}
                            </Text>
                            <Text style={[styles.cell, styles.statCell, { color: theme.text }]}>
                                {item.wins}
                            </Text>
                            <Text style={[styles.cell, styles.statCell, { color: theme.text }]}>
                                {item.losses}
                            </Text>
                            <Text style={[styles.cell, styles.statCell, { color: theme.text }]}>
                                {item.points}
                            </Text>
                        </View>
                    );
                }}
            />
        </GradientView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
        paddingTop: -8,
        borderRadius: 12,
    },
    loadingText: {
        marginTop: 8,
    },
    errorText: {
        fontSize: 14,
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
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    cell: {
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