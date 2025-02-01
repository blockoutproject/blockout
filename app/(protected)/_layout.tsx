import React, { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { View, ActivityIndicator, TouchableOpacity, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

            {/* Écran modal pour afficher les détails */}
            <Stack.Screen
                name="match"
                options={{
                    presentation: 'modal',
                    header: () => (
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: '#111',
                                paddingHorizontal: 12,
                                paddingVertical: 15
                            }}
                        >
                            {/* Bouton back */}
                            <TouchableOpacity
                                onPress={() => router.back()}              >
                                <Ionicons name="arrow-back" size={30} color="#fff" />
                            </TouchableOpacity>

                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                            >
                                {/* Logo + Titre */}
                                <Image
                                    source={require('../../assets/leagues/msl.png')} // Remplacez par votre logo
                                    style={{ width: 28, height: 28, marginRight: 8, borderRadius: 5 }}
                                    resizeMode="contain"
                                />
                                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
                                    N2F Poule C
                                </Text>
                            </View>

                            {/* Bouton partage */}
                            <TouchableOpacity
                                onPress={() => {
                                    // Votre logique de partage ici
                                    console.log('Share pressed !');
                                }}
                            >
                                <Ionicons name="share-outline" size={30} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />
        </Stack>
    );
}