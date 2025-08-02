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
import { useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native-gesture-handler';
import { HEIGHT } from '@/src/theme/globals';

const Match: React.FC = () => {
    const { match_id } = useLocalSearchParams();
    const matchId = Number(match_id);
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
        <ScrollView
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom, paddingTop: insets.top + HEIGHT + 10 },
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
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        gap: 20,
        paddingHorizontal: 4,
    },
});

export default Match;
