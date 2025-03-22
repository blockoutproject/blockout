// app/(auth)/login.tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    Pressable,
    Dimensions
} from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useRouter } from 'expo-router';
import { colors } from '@/src/constants/Colors';

const LoginScreen: React.FC = () => {
    const { authorize } = useAuth0();
    const router = useRouter();

    const handleLogin = async () => {
        try {
            // Par défaut, Auth0 ouvre l’onglet "Login".
            await authorize({
                audience: 'https://api.blockoutproject.com/',
            });
            // L'AuthLayout redirigera automatiquement si user est défini
        } catch (e) {
            console.log('Erreur de connexion :', e);
        }
    };

    return (
        <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1580502304638-2372f3486f99' }}
            style={styles.background}
            resizeMode="cover"
        >
            {/* Overlay pour assombrir l'image */}
            <View style={styles.overlay} />

            <View style={styles.contentContainer}>
                <Text style={styles.title}>Blockout</Text>
                <Text style={styles.tagline}>
                    Ton appli pour consulter les scores et suivre tes matchs de volley
                </Text>

                {/* Bouton Se connecter */}
                <Pressable style={styles.loginButton} onPress={handleLogin}>
                    <Text style={styles.loginButtonText}>Se connecter</Text>
                </Pressable>
            </View>
        </ImageBackground>
    );
};

export default LoginScreen;

const styles = StyleSheet.create({
    background: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.dark,
    },
    contentContainer: {
        flex: 1,
        width: '80%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 48,
        color: colors.light,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    tagline: {
        fontSize: 16,
        color: colors.light,
        textAlign: 'center',
        marginHorizontal: 10,
        marginBottom: 50,
    },
    loginButton: {
        backgroundColor: colors.lightGrey,
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        marginBottom: 15,
    },
    signupButton: {
        // Tu peux changer la couleur pour différencier "Créer un compte"
        backgroundColor: colors.lightGrey, 
    },
    loginButtonText: {
        color: colors.light,
        fontSize: 18,
        fontWeight: '600',
    },
});