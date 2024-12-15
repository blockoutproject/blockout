import React from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import MatchCard from '../../components/MatchCard';
import { matches } from '../../data/matches';

export default function HomeScreen() {
    const router = useRouter();

    const handleCardPress = (matchId: string) => {
        // Naviguer vers la modal avec l'ID du match
        router.push({
            pathname: '/match', // Route modale définie dans le layout
            params: { id: matchId }, // Paramètres passés à la modal
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Liste des matchs</Text>
            <FlatList
                data={matches}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleCardPress(item.id)}>
                        <MatchCard
                            teams={item.teams}
                            date={item.date}
                            location={item.location}
                        />
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