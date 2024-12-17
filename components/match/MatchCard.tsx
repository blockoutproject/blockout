import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Match, MatchStatus } from '../../types/Match';

type MatchCardProps = {
    match: Match;
};

export default function MatchCard({ match }: MatchCardProps) {
    const formattedDate = new Date(match.match_date).toLocaleString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <View style={styles.card}>
            <Text style={styles.teams}>
                {`Team ${match.team_id_a} vs Team ${match.team_id_b}`}
            </Text>
            <Text style={styles.date}>{formattedDate}</Text>
            <Text style={styles.location}>{match.venue || 'Lieu non spécifié'}</Text>
            <Text style={styles.status}>
                {match.status === MatchStatus.UPCOMING
                    ? 'À venir'
                    : 'Terminé'}
            </Text>
            {match.score && <Text style={styles.score}>{`Score: ${match.score}`}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        padding: 16,
        marginVertical: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 3,
    },
    teams: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    date: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
    },
    location: {
        fontSize: 14,
        color: '#777',
        marginBottom: 4,
    },
    status: {
        fontSize: 14,
        color: '#007BFF',
        fontWeight: 'bold',
    },
    score: {
        fontSize: 16,
        color: '#28a745',
        fontWeight: 'bold',
        marginTop: 4,
    },
});