import React, { useEffect, useState } from 'react';
import { View, TextInput, FlatList, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useDebounce } from 'use-debounce';
import { useSearchTeams } from '@/src/hooks/team/useSearchTeams';

const SearchScreen = () => {
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const router = useRouter();

    const { data: teams, isLoading } = useSearchTeams(debouncedQuery);

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <TextInput
                placeholder="Rechercher une équipe..."
                value={query}
                onChangeText={setQuery}
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                }}
            />

            {isLoading && <Text>Chargement...</Text>}

            <FlatList
                data={teams}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => router.push(`/team/${item.id}`)}
                        style={{
                            padding: 12,
                            borderBottomColor: '#eee',
                            borderBottomWidth: 1,
                        }}
                    >
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
                        <Text style={{ color: '#666' }}>{item.divisionName} {item.gender}</Text>
                    </Pressable>
                )}
                ListEmptyComponent={
                    debouncedQuery.length > 1 && !isLoading ? <Text>Aucune équipe trouvée</Text> : null
                }
            />
        </View>
    );
};

export default SearchScreen;