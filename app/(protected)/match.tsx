import React from 'react';
import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMatchById } from '@/hooks/match/useMatchById';
import MatchScoreCard from '@/components/match/MatchScoreCard';
import MatchScoreDetailsCard from '@/components/match/MatchScoreDetailsCard';
import MatchInfoCard from '@/components/match/MatchInfoCard';
import RankingCard from '@/components/pool/RankingCard';

export default function MatchModalScreen() {
    const params = useLocalSearchParams();
    const matchId = Number(params.id);
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
                            homeTeamName={teamA.team_name}
                            homeTeamLogo="https://exemple.com/logo-ascannes.png"
                            awayTeamName={teamB.team_name}
                            awayTeamLogo="https://exemple.com/logo-recvolley.png"
                            finalScore={match.set || '0 : 0'}
                        />

                        {/* 📌 ScrollView pour tout le reste */}
                        <MatchScoreDetailsCard title="Score" homeTeam={teamA} awayTeam={teamB} match={match} />
                        <MatchInfoCard
                            date={match.match_date}
                            duration="1h30"
                            league={match.league_code}
                            venue={match.venue}
                            referee1={match.referee1}
                            referee2={match.referee2}
                        />
                        <RankingCard poolId={match.pool_id} />
                    </ScrollView>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: '#111',
        paddingVertical: 10,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
});
