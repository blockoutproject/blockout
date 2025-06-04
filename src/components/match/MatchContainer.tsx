import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Text, View } from 'react-native';
import { useMatchById } from '@/src/hooks/match/useMatchById';
import { MatchStatus } from '@/src/types/Match';
import { Confetti } from 'react-native-fast-confetti';
import { useAppTheme } from '@/src/context/ThemeProvider';
import MatchSkeleton from '@/src/components/match/MatchSkeleton';
import MatchScoreCard from '@/src/components/match/MatchScoreCard';
import RankingCard from '@/src/components/common/RankingCard';
import MatchScoreDetailsCard from '@/src/components/match/MatchScoreDetailsCard';
import MatchInfoCard from '@/src/components/match/MatchInfoCard';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLeagueLabel } from '@/src/utils/utils';

type Props = {
    matchId: number;
};

const MatchContainer: React.FC<Props> = ({ matchId }) => {
    const { match, teamA, teamB, pool, isLoading } = useMatchById(matchId);
    const theme = useAppTheme();

    const [showConfetti, setShowConfetti] = useState(false);
    const insets = useSafeAreaInsets();
    
    useEffect(() => {
        if (match?.status === MatchStatus.FINISHED) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [match?.status]);

    if (isLoading) return <MatchSkeleton />;

    return (
        <View style={{ backgroundColor: theme.background }}>
            {/* {showConfetti && (
                    <Confetti
                        count={100}
                        fallDuration={3000}
                        fadeOutOnEnd
                        colors={['#FF5733', '#FFC300', '#DAF7A6', '#FF33FF', '#33FF57', '#3357FF', '#C70039', '#900C3F', '#581845']}
                    />
                )} */}
            {teamA && teamB && match && pool ? (
                <BottomSheetScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 8}]}
                >
                    <MatchScoreCard
                        leagueName={getLeagueLabel(pool)}
                        homeTeam={teamA}
                        awayTeam={teamB}
                        finalScore={match.set}
                        matchDate={match.matchDate}
                    />
                    <MatchScoreDetailsCard title="Score" homeTeam={teamA} awayTeam={teamB} match={match} />
                    <MatchInfoCard
                        pool={pool}
                        date={match.matchDate}
                        duration="1h30"
                        leagueName={getLeagueLabel(pool)}
                        venue={match.venue}
                        referee1={match.referee1}
                        referee2={match.referee2}
                    />
                    <RankingCard poolId={match.poolId} scrollable={false} />
                </BottomSheetScrollView>
            ) : (
                <Text style={{ color: theme.text }}>Erreur de chargement du match</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        gap: 32,
        paddingHorizontal: 8,
    },
});

export default MatchContainer;