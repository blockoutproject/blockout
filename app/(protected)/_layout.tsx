import React, { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchHeader } from '@/components/match/MatchHeader';
import { PoolHeader } from '@/components/pool/PoolHeader';

export default function ProtectedLayout() {
    const { user, isLoading } = useAuth0();

    // Redirige vers la page de login si l'utilisateur n'est pas connecté
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [isLoading, user]);

    // Affiche un écran de chargement pendant la vérification
    if (isLoading || !user) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack>
            {/* Écran principal (home) */}
            <Stack.Screen
                name="home"
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="match"
                options={{
                    presentation: 'modal',
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="pool"
                options={{
                    presentation: 'modal',
                    headerShown: false
                }}
            />
        </Stack>
    );
}