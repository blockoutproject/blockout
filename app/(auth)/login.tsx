import React from 'react';
import { View, Button } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

export default function LoginScreen() {
    const { authorize } = useAuth0();

    const handleLogin = async () => {
        try {
            const token = await authorize({
                audience: 'https://api.blockoutproject.com/'
            });
            console.log('Token :', token);
        } catch (e) {
            console.log('Erreur de connexion :', e);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Button title="Se connecter avec Auth0" onPress={handleLogin} />
        </View>
    );
}