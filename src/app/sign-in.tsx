import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Pressable } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { useSession } from '@/src/context/SessionProvider';

const LoginScreen: React.FC = () => {
    const { signIn } = useSession();
    const theme = useAppTheme();

    return (
        <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1580502304638-2372f3486f99' }}
            style={styles.background}
            resizeMode="cover"
        >
            <View style={[styles.overlay, { backgroundColor: theme.backgroundSecondary }]} />
            <View style={styles.contentContainer}>
                <Text style={[styles.title, { color: theme.text }]}>Blockout</Text>
                <Text style={[styles.tagline, { color: theme.textInactive }]}>
                    Ton appli pour consulter les scores et suivre tes matchs de volley
                </Text>

                <Pressable
                    style={[styles.loginButton, { backgroundColor: theme.text }]}
                    onPress={signIn}
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
        alignItems: 'center' 
    },
    overlay: { 
        ...StyleSheet.absoluteFillObject 
    },
    contentContainer: { 
        flex: 1, 
        width: '80%', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    title: { 
        fontSize: 48, 
        fontWeight: 'bold', 
        marginBottom: 16 
    },
    tagline: { 
        fontSize: 14, 
        textAlign: 'center', 
        marginHorizontal: 10, 
        marginBottom: 50 
    },
    loginButton: { 
        paddingVertical: 15, 
        paddingHorizontal: 40, 
        borderRadius: 30, 
        marginBottom: 15 
    },
    loginButtonText: { 
        fontSize: 18, 
        fontWeight: '600' 
    },
});