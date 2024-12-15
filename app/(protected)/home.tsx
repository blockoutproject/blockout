import React from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import MatchCard from '../../components/MatchCard';
import { matches } from '../../data/matches';
import { Match } from '../../models/Match';

export default function HomeScreen() {
    const router = useRouter();

    const handleCardPress = (matchId: number) => {
        // Naviguer vers la modal avec l'ID du match
        router.push({
            pathname: '/match', // Route modale définie dans le layout
            params: { id: matchId.toString() }, // Paramètres passés à la modal (en string)
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Liste des matchs</Text>
            <FlatList
                data={matches}
                keyExtractor={(item: Match) => item.id.toString()} // id est un number, donc conversion en string
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleCardPress(item.id)}>
                        <MatchCard match={item} /> {/* Transmet tout l'objet Match à MatchCard */}
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
});