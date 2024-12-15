import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type MatchCardProps = {
    teams: string[];
    date: string;
    location: string;
};

export default function MatchCard({ teams, date, location }: MatchCardProps) {
    const formattedDate = new Date(date).toLocaleString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <View style={styles.card}>
            <Text style={styles.teams}>{`${teams[0]} vs ${teams[1]}`}</Text>
            <Text style={styles.date}>{formattedDate}</Text>
            <Text style={styles.location}>{location}</Text>
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
    },
});