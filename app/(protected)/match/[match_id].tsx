import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMatchById } from '@/hooks/match/useMatchById';
import MatchScoreCard from '@/components/match/MatchScoreCard';
import MatchScoreDetailsCard from '@/components/match/MatchScoreDetailsCard';
import MatchInfoCard from '@/components/match/MatchInfoCard';
import RankingCard from '@/components/common/RankingCard';
import { colors } from '@/constants/Colors';
import { MatchStatus } from '@/types/Match';
import { Confetti } from 'react-native-fast-confetti';
import { usePoolById } from '@/hooks/pool/usePoolById';

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
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text>Chargement en cours...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {showConfetti && (
                <Confetti
                    count={100} // Nombre de confettis
                    fallDuration={3000} // Durée de la chute des confettis
                    colors={['#FF5733', '#FFC300', '#DAF7A6', '#FF33FF', '#33FF57', '#3357FF', '#FF5733', '#C70039', '#900C3F', '#581845']}
                    fadeOutOnEnd={true} // Les confettis disparaissent progressivement
                />
            )}
            {teamA && teamB && match && pool && (
                <>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <MatchScoreCard
                            homeTeam={teamA}
                            awayTeam={teamB}
                            finalScore={match.set || '0 : 0'}
                        />
                        <MatchScoreDetailsCard title="Score" homeTeam={teamA} awayTeam={teamB} match={match} />
                        <MatchInfoCard
                            pool={pool}
                            date={match.match_date}
                            duration="1h30"
                            league={match.league_code}
                            venue={match.venue}
                            referee1={match.referee1}
                            referee2={match.referee2}
                        />
                        <RankingCard poolId={match.pool_id} scrollable={false} />
                    </ScrollView>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.dark,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
});

export default MatchModalScreen;
