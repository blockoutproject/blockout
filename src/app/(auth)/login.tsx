import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    Pressable,
} from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useAppTheme } from '@/src/context/ThemeProvider';

const LoginScreen: React.FC = () => {
    const { authorize } = useAuth0();
    const theme = useAppTheme();

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
            <View style={[styles.overlay, { backgroundColor: theme.backgroundSecondary }]} />

            <View style={styles.contentContainer}>
                <Text style={[styles.title, { color: theme.text }]}>Blockout</Text>
                <Text style={[styles.tagline, { color: theme.textInactive }]}>
                    Ton appli pour consulter les scores et suivre tes matchs de volley
                </Text>

                {/* Bouton Se connecter */}
                <Pressable
                    style={[styles.loginButton, { backgroundColor: theme.text }]}
                    onPress={handleLogin}
                >
                    <Text style={[styles.loginButtonText, { color: theme.textTiertiary }]}>Se connecter</Text>
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
    },
    contentContainer: {
        flex: 1,
        width: '80%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    tagline: {
        fontSize: 14,
        textAlign: 'center',
        marginHorizontal: 10,
        marginBottom: 50,
    },
    loginButton: {
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        marginBottom: 15,
    },
    loginButtonText: {
        fontSize: 18,
        fontWeight: '600',
    },
});