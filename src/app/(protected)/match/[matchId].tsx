import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMatchById } from '@/src/hooks/match/useMatchById';
import MatchScoreDetailsCard from '@/src/components/match/MatchScoreDetailsCard';
import MatchInfoCard from '@/src/components/match/MatchInfoCard';
import RankingCard from '@/src/components/common/RankingCard';
import { MatchStatus } from '@/src/types/Match';
import { Confetti } from 'react-native-fast-confetti';
import MatchSkeleton from '@/src/components/match/MatchSkeleton';
import MatchScoreCard from '@/src/components/match/MatchScoreCard';
import { useAppTheme } from '@/src/context/ThemeProvider';

const MatchModalScreen: React.FC = () => {
    const { matchId } = useLocalSearchParams();
    const matchIdNumber = Number(matchId);
    const { match, teamA, teamB, pool, isLoading } = useMatchById(matchIdNumber);
    const theme = useAppTheme();

    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (match?.status === MatchStatus.FINISHED) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [match?.status]);

    if (isLoading) {
        return <MatchSkeleton />;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {showConfetti && (
                <Confetti
                    count={100}
                    fallDuration={3000}
                    fadeOutOnEnd
                    colors={[
                        '#FF5733', '#FFC300', '#DAF7A6', '#FF33FF',
                        '#33FF57', '#3357FF', '#C70039', '#900C3F',
                        '#581845',
                    ]}
                />
            )}

            {teamA && teamB && match && pool && (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <MatchScoreCard
                        leagueName={`${pool.divisionName} - ${pool.gender}`}
                        homeTeam={teamA}
                        awayTeam={teamB}
                        finalScore={match.set}
                        matchDate={match.matchDate}
                    />

                    <MatchScoreDetailsCard
                        title="Score"
                        homeTeam={teamA}
                        awayTeam={teamB}
                        match={match}
                    />

                    <MatchInfoCard
                        pool={pool}
                        date={match.matchDate}
                        duration="1h30"
                        league={match.leagueCode}
                        venue={match.venue}
                        referee1={match.referee1}
                        referee2={match.referee2}
                    />

                    <RankingCard
                        poolId={match.poolId}
                        scrollable={false}
                    />
                </ScrollView>
            )}
        </View>
    );
};

export default MatchModalScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        gap: 16,
        paddingHorizontal: 8,
        paddingBottom: 32,
    },
});