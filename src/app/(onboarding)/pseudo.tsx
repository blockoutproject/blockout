import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/src/hooks/user/useUser';
import UsersApi from '@/src/api/UsersApi';

export default function PseudoScreen() {
    const { data: customUser, refetch } = useUser();
    const router = useRouter();

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
            } else {
                // User existe -> on met à jour
                await usersApi.updateUser(customUser.id, { pseudo });
            }

            // Refetch pour mettre à jour localement
            await refetch();

            // Écran suivant
            router.replace('/(protected)/home');
        } catch (error) {
            console.error('Erreur lors de la validation du pseudo :', error);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Choisis ton pseudo</Text>
            <TextInput
                style={{ borderWidth: 1, marginVertical: 10, width: 200 }}
                value={pseudo}
                onChangeText={setPseudo}
            />
            <Button title='Valider' onPress={handleValidatePseudo} />
        </View>
    );
}