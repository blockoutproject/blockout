import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { matches } from '../../data/matches';

export default function MatchDetailsModal() {
    const params = useLocalSearchParams();
    const router = useRouter();

    const match = matches.find((match) => match.id === params.id);

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
            <Text style={styles.title}>{`${match.teams[0]} vs ${match.teams[1]}`}</Text>
            <Text style={styles.text}>Date : {new Date(match.date).toLocaleString('fr-FR')}</Text>
            <Text style={styles.text}>Lieu : {match.location}</Text>
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