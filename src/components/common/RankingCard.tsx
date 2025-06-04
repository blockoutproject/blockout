import React from 'react';
import { 
    View, 
    Text, 
    ActivityIndicator, 
    StyleSheet, 
    TouchableOpacity 
} from 'react-native';
import { useDetailedTeamsByPool } from '@/src/hooks/pool/useDetailedTeamsByPool';
import FastImage from 'react-native-fast-image';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { AppTheme } from '@/src/types/Theme';
import GradientView from './GradientView';
import { FlatList } from 'react-native-gesture-handler';
import TeamContainer from '../team/TeamContainer';
import { useGlobalBottomSheet } from '@/src/context/GlobalBottomSheetProvider';
import * as Haptics from 'expo-haptics';
import GradientBorderView from './GradientBorderView';

interface RankingCardProps {
    poolId: number;
    scrollable?: boolean;
}

function getRankColor(rank: number, theme: AppTheme): string {
    if (rank === 1) return theme.gold;
    if (rank === 2) return theme.silver;
    if (rank === 3) return theme.bronze;
    return theme.surfaceTertiary;
}

function getRankBackground(isEven: boolean, theme: AppTheme): string {
    return isEven ? theme.surface : 'transparent';
}

const RankingCard: React.FC<RankingCardProps> = ({ poolId, scrollable = true }) => {
    const { teams, isLoading, isError } = useDetailedTeamsByPool(poolId);
    const theme = useAppTheme();
    const { openSheet } = useGlobalBottomSheet();

    const handleTeamPress = (teamId: number) => {
        Haptics.selectionAsync();
        openSheet(<TeamContainer teamId={teamId} />);
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
        <GradientBorderView
            style={[styles.container]}
            colorsOverride={[theme.borderSecondary, theme.backgroundSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
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
                                    styles.transparentRankIndicator,                                ]}
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
        </GradientBorderView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexShrink: 1,
        padding: 8,
        paddingTop: -8,
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
        borderRadius: 10,
        height: 50,
    },
    transparentRankIndicator: {
        marginRight: 8,
    },
    headerText: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    cell: {
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