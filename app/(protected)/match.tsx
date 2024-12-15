import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { matches } from '../../data/matches';
import { Match } from '../../models/Match';

export default function MatchDetailsModal() {
    const params = useLocalSearchParams();
    const router = useRouter();

    // Recherche du match correspondant à l'ID dans les paramètres
    const match: Match | undefined = matches.find(
        (match) => match.id === Number(params.id)
    );

    if (!match) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Match introuvable.</Text>
                <Button title="Retour" onPress={() => router.back()} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {`Match : ${match.match_code}`}
            </Text>
            <Text style={styles.teams}>
                {`Équipe A : Team ${match.team_id_a} vs Équipe B : Team ${match.team_id_b}`}
            </Text>
            <Text style={styles.text}>
                Date : {match.match_date.toLocaleString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </Text>
            <Text style={styles.text}>{`Lieu : ${match.venue || 'Non spécifié'}`}</Text>
            <Text style={styles.text}>
                {`Statut : ${
                    match.status === 'UPCOMING' ? 'À venir' : 'Terminé'
                }`}
            </Text>
            {match.score && (
                <Text style={styles.text}>{`Score : ${match.score}`}</Text>
            )}
            {match.referee1 && (
                <Text style={styles.text}>{`Arbitre 1 : ${match.referee1}`}</Text>
            )}
            {match.referee2 && (
                <Text style={styles.text}>{`Arbitre 2 : ${match.referee2}`}</Text>
            )}
            <Button title="Fermer" onPress={() => router.back()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    teams: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    text: {
        fontSize: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 18,
        color: 'red',
        marginBottom: 16,
    },
});