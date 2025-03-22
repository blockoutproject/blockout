import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMatchById } from '@/src/hooks/match/useMatchById';
import MatchScoreCard from '@/src/components/match/MatchScoreCard';
import MatchScoreDetailsCard from '@/src/components/match/MatchScoreDetailsCard';
import MatchInfoCard from '@/src/components/match/MatchInfoCard';
import RankingCard from '@/src/components/common/RankingCard';
import { colors } from '@/src/constants/Colors';
import { MatchStatus } from '@/src/types/Match';
import { Confetti } from 'react-native-fast-confetti';
import MatchSkeleton from '@/src/components/match/MatchSkeleton';

const MatchModalScreen: React.FC = () => {
    const { match_id } = useLocalSearchParams();
    const matchId = Number(match_id);
    const { match, teamA, teamB, pool, isLoading } = useMatchById(matchId);

    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (match && match.status === MatchStatus.FINISHED) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
        }
    }, [match]);

    if (isLoading) {
        return <MatchSkeleton />;
    }

    return (
        <View style={styles.container}>
            {/* Confettis en cas de match terminé */}
            {showConfetti && (
                <Confetti
                    count={100}
                    fallDuration={3000}
                    fadeOutOnEnd
                    colors={[
                        '#FF5733', '#FFC300', '#DAF7A6', '#FF33FF',
                        '#33FF57', '#3357FF', '#C70039', '#900C3F',
                        '#581845'
                    ]}
                />
            )}

            {/* On vérifie que toutes les données nécessaires sont présentes */}
            {teamA && teamB && match && pool && (
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Carte Score */}
                    <MatchScoreCard
                        homeTeam={teamA}
                        awayTeam={teamB}
                        finalScore={match.set || '0 : 0'}
                    />

                    {/* Score détaillé */}
                    <MatchScoreDetailsCard
                        title="Score"
                        homeTeam={teamA}
                        awayTeam={teamB}
                        match={match}
                    />

                    {/* Informations (ligue, date, lieu, arbitres) */}
                    <MatchInfoCard
                        pool={pool}
                        date={match.match_date}
                        duration="1h30"
                        league={match.league_code}
                        venue={match.venue}
                        referee1={match.referee1}
                        referee2={match.referee2}
                    />

                    {/* Classement */}
                    <RankingCard poolId={match.pool_id} scrollable={false} />
                </ScrollView>
            )}
        </View>
    );
};

export default MatchModalScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.dark,
    },
    scrollSkeleton: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
});