import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMatchById } from '@/hooks/match/useMatchById';
import MatchScoreCard from '@/components/match/MatchScoreCard';
import MatchScoreDetailsCard from '@/components/match/MatchScoreDetailsCard';
import MatchInfoCard from '@/components/match/MatchInfoCard';
import RankingCard from '@/components/common/RankingCard';
import { colors } from '@/constants/Colors';

const MatchModalScreen: React.FC = () => {
    const { match_id } = useLocalSearchParams();
    const matchId = Number(match_id);
    const { match, teamA, teamB, isLoading } = useMatchById(matchId);

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
            {teamA && teamB && match && (
                <>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <MatchScoreCard
                            homeTeam={teamA}
                            awayTeam={teamB}
                            finalScore={match.set || '0 : 0'}
                        />
                        <MatchScoreDetailsCard title="Score" homeTeam={teamA} awayTeam={teamB} match={match} />
                        <MatchInfoCard
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
