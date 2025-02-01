import React from 'react';
import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMatchById } from '@/hooks/useMatchById';
import { useTeamsByIds } from '@/hooks/useTeamsByIds';
import MatchScoreCard from '@/components/match/MatchScoreCard';
import MatchScoreDetailsCard from '@/components/match/MatchScoreDetailsCard';
import MatchInfoCard from '@/components/match/MatchInfoCard';

export default function MatchModalScreen() {
    const params = useLocalSearchParams();
    const matchId = Number(params.id);

    // Récupération du match à partir du cache grâce à notre hook
    const match = useMatchById(matchId);

    // Récupération des équipes associées si le match existe
    const { teams, isLoading: teamsLoading } = useTeamsByIds(
        match ? [match.team_id_a, match.team_id_b] : []
    );

    if (!match || teamsLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text>Chargement en cours...</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {teams && teams[0] && teams[1] && (
                <>
                    <MatchScoreCard
                        homeTeamName={teams[0].team_name}
                        homeTeamLogo="https://exemple.com/logo-ascannes.png"
                        awayTeamName={teams[1].team_name}
                        awayTeamLogo="https://exemple.com/logo-recvolley.png"
                        finalScore={match.set || '0 : 0'}
                    />
                    <MatchScoreDetailsCard
                        title="Score"
                        homeTeam={teams[0]}
                        awayTeam={teams[1]}
                        match={match}
                    />
                    <MatchInfoCard
                        date={match.match_date}
                        duration="1h30"
                        league={match.league_code}
                        venue={match.venue}
                        referee1={match.referee1}
                        referee2={match.referee2}
                    />
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#111',
    },
});