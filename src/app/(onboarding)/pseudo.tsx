import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import UsersApi from '@/src/api/UsersApi';
import { useUserContext } from '@/src/context/UserProvider';
import { useAppTheme } from '@/src/context/ThemeProvider';

export default function PseudoScreen() {
    const { customUser, refetch } = useUserContext();
    const router = useRouter();
    const theme = useAppTheme();

    const [pseudo, setPseudo] = useState('');

    // Pré-remplir si déjà un pseudo en base
    useEffect(() => {
        if (customUser?.pseudo) {
            setPseudo(customUser.pseudo);
        }
    }, [customUser]);

    const handleValidatePseudo = async () => {
        try {
            const usersApi = UsersApi.getInstance();

            if (!customUser) {
                // User n’existe pas -> on le crée
                await usersApi.registerUser({ pseudo });
            }

            // Refetch pour mettre à jour localement
            refetch();

            // Écran suivant
            router.replace('/(protected)/home');
        } catch (error) {
            console.error('Erreur lors de la validation du pseudo :', error);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.title, { color: theme.text }]}>Choisis ton pseudo</Text>
            <TextInput
                style={[styles.input, { borderColor: theme.textInactive, color: theme.text }]}
                value={pseudo}
                onChangeText={setPseudo}
                placeholder="Pseudo"
                placeholderTextColor={theme.textInactive}
            />
            <Button title="Valider" onPress={handleValidatePseudo} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        width: '80%',
        marginBottom: 16,
    },
});