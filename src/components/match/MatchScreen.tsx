import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEnrichedMatchById } from '@/src/hooks/match/useEnrichedMatchById';
import MatchSkeleton from '@/src/components/match/components/MatchSkeleton';
import MatchScoreCard from '@/src/components/match/components/MatchScoreCard';
import MatchScoreDetailsCard from '@/src/components/match/components/MatchScoreDetailsCard';
import MatchInfoCard from '@/src/components/match/components/MatchInfoCard';
import RankingCard from '@/src/components/common/RankingCard';
import { TABBAR_HEIGHT } from '@/src/theme/globals';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SheetStackParamList } from '@/src/components/common/BottomSheetNavigator';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { getTeamsRankingColor } from '@/src/utils/utils';

type MatchRouteProp = RouteProp<SheetStackParamList, 'Match'>;

const MatchScreen: React.FC = () => {
    const { params } = useRoute<MatchRouteProp>();
    const matchId = params.matchId;
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

    const division = enrichedMatch.pool.division;
    if (!division) {
        throw new Error("EnrichedPoolDTO.division is required but was undefined.");
    }

    const gradient: readonly [string, string, ...string[]] = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ];

    return (
        <BottomSheetScrollView
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
                styles.scrollContent,
                { backgroundColor: theme.background, paddingBottom: insets.bottom, paddingTop: TABBAR_HEIGHT },
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
                enrichedPool={enrichedMatch.pool}
                scrollable={false}
                highlightTeams={getTeamsRankingColor(
                    theme,
                    {
                        teamA: enrichedMatch.teamA,
                        teamB: enrichedMatch.teamB,
                        set: enrichedMatch.set,
                    })}
            />
        </BottomSheetScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        gap: 20,
        paddingHorizontal: 4,
    },
});

export default MatchScreen;
