import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';
import MatchSkeleton from './components/MatchSkeleton';
import MatchScoreCard from './components/MatchScoreCard';
import RankingCard from '../common/RankingCard';
import MatchScoreDetailsCard from './components/MatchScoreDetailsCard';
import MatchInfoCard from './components/MatchInfoCard';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEnrichedMatchById } from '@/src/hooks/match/useEnrichedMatchById';

type Props = { matchId: number };

const MatchScreen: React.FC<Props> = ({ matchId }) => {
    const { data: enrichedMatch, isLoading, isError } = useEnrichedMatchById(matchId)

    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    if (isLoading) return <MatchSkeleton />;

    if (isError || !enrichedMatch) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: theme.text }}>Match not found</Text>
            </View>
        );
    }

    const gradient: readonly [string, string, ...string[]] = [
        enrichedMatch.pool.division.firstGradientColor,
        enrichedMatch.pool.division.secondGradientColor,
        enrichedMatch.pool.division.thirdGradientColor,
    ];

    return (
        <View style={{ backgroundColor: theme.background }}>
            <BottomSheetScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 8 },
                ]}
            >
                <MatchScoreCard
                    enrichedMatch={enrichedMatch}
                    gradient={gradient}
                />
                <MatchScoreDetailsCard
                    title="Score"
                    enrichedMatch={enrichedMatch}
                />
                <MatchInfoCard
                    enrichedMatch={enrichedMatch}
                />
                <RankingCard
                    poolId={enrichedMatch.pool.id}
                    division={enrichedMatch.pool.division}
                    scrollable={false}
                />
            </BottomSheetScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        gap: 20,
        paddingHorizontal: 4,
    },
});

export default MatchScreen;
