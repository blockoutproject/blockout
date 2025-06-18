import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useMatchById } from '@/src/hooks/match/useMatchById';
import { MatchStatus } from '@/src/types/Match';
import { useAppTheme } from '@/src/context/ThemeProvider';
import MatchSkeleton from './components/MatchSkeleton';
import MatchScoreCard from './components/MatchScoreCard';
import RankingCard from '../common/RankingCard';
import MatchScoreDetailsCard from './components/MatchScoreDetailsCard';
import MatchInfoCard from './components/MatchInfoCard';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLeagueLabel } from '@/src/utils/utils';
import { usePoolGradient } from '@/src/hooks/utils/usePoolGradient';
import { usePoolBorderGradient } from '@/src/hooks/utils/usePoolBorderGradient';

type Props = { matchId: number };

const Match: React.FC<Props> = ({ matchId }) => {
    const { match, teamA, teamB, pool, isLoading } = useMatchById(matchId);
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const [showConfetti, setShowConfetti] = useState(false);
    const gradientVariants = usePoolBorderGradient(pool ? pool?.id : 1);

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
            {teamA && teamB && match && pool ? (
                <BottomSheetScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + 8 },
                    ]}
                >
                    <MatchScoreCard
                        leagueName={getLeagueLabel(pool)}
                        homeTeam={teamA}
                        awayTeam={teamB}
                        finalScore={match.set}
                        matchDate={match.matchDate}
                        gradient={gradientVariants}
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
                        leagueName={getLeagueLabel(pool)}
                        venue={match.venue}
                        referee1={match.referee1}
                        referee2={match.referee2}
                    />
                    <RankingCard 
                        poolId={match.poolId} 
                        scrollable={false} 
                    />
                </BottomSheetScrollView>
            ) : (
                <Text style={{ color: theme.text }}>Erreur de chargement du match</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        gap: 20,
        paddingHorizontal: 4,
    },
});

export default Match;
