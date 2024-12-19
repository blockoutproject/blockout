import React from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Button } from 'react-native';
import { useRouter } from 'expo-router';
import MatchCard from '../../components/match/MatchCard';
import { Match } from '../../types/Match';
import { useMatches } from '@/hooks/useMatches';
import { useAuth0 } from 'react-native-auth0';

export default function HomeScreen() {
    const router = useRouter();
    const { clearSession } = useAuth0();
    const { matches, isLoading, isError, error, fetchNextPage, hasNextPage, isFetching } = useMatches(10);

    const handleCardPress = (matchId: number) => {
        router.push({
            pathname: '/match',
            params: { id: matchId.toString() },
        });
    };

    const loadMoreMatches = () => {
        if (hasNextPage) {
            fetchNextPage();
        }
    };

    const handleLogin = async () => {
        try {
            await clearSession();
        } catch (e) {
            console.log('Erreur de connexion :', e);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Liste des matchs</Text>

            {isLoading && <ActivityIndicator size="large" color="#0000ff" />}

            {isError && <Text style={styles.errorText}>Erreur : {error?.message}</Text>}

            <FlatList
                data={matches}
                keyExtractor={(item: Match) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleCardPress(item.id)}>
                        <MatchCard match={item} />
                    </TouchableOpacity>
                )}
                onEndReached={loadMoreMatches}
                onEndReachedThreshold={0.5} // Déclenche à mi-chemin du bas
                ListFooterComponent={
                    isFetching ? <ActivityIndicator size="small" color="#0000ff" /> : null
                }
            />


        <Button title="Se déconnecter" onPress={handleLogin} />

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
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
    },
});