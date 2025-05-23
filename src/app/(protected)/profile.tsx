import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import FastImage from 'react-native-fast-image';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { router } from 'expo-router';

const ProfileScreen: React.FC = () => {
    const { user, clearSession } = useAuth0();
    const theme = useAppTheme();

    const handleLogout = async () => {
        try {
            await clearSession();
        } catch (error) {
            console.log('Erreur lors de la déconnexion :', error);
        }
    };

    if (!user) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.text} />
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.scrollContainer, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* HEADER */}
            <View style={styles.profileHeader}>
                {user.picture && (
                    <FastImage source={{ uri: user.picture }} style={styles.avatar} />
                )}
                <Text style={[styles.username, { color: theme.text }]}>{user.name || 'Utilisateur'}</Text>
                <Text style={[styles.email, { color: theme.textInactive }]}>{user.email}</Text>
            </View>

            {/* LISTE DE SECTIONS CLIQUABLES */}
            <View style={styles.menuContainer}>
                {/* Éditer le profil */}
                <Pressable
                    style={[styles.menuItem, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => router.push('/profile/edit')}
                >
                    <Text style={[styles.menuItemText, { color: theme.text }]}>Éditer mon profil</Text>
                </Pressable>

                {/* Changer le mot de passe */}
                <Pressable
                    style={[styles.menuItem, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => router.push('/profile/change-password')}
                >
                    <Text style={[styles.menuItemText, { color: theme.text }]}>Changer mon mot de passe</Text>
                </Pressable>

                {/* Notifications */}
                <Pressable
                    style={[styles.menuItem, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => router.push('/profile/notifications')}
                >
                    <Text style={[styles.menuItemText, { color: theme.text }]}>Notifications</Text>
                </Pressable>

                {/* About */}
                <Pressable
                    style={[styles.menuItem, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => router.push('/profile/about')}
                >
                    <Text style={[styles.menuItemText, { color: theme.text }]}>À propos</Text>
                </Pressable>

                {/* Help */}
                <Pressable
                    style={[styles.menuItem, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => router.push('/profile/help')}
                >
                    <Text style={[styles.menuItemText, { color: theme.text }]}>Aide</Text>
                </Pressable>

                {/* Déconnexion */}
                <Pressable style={[styles.logoutButton, { backgroundColor: theme.error }]} onPress={handleLogout}>
                    <Text style={[styles.logoutButtonText, { color: theme.text }]}>Se déconnecter</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
};

export default ProfileScreen;

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileHeader: {
        marginTop: 40,
        alignItems: 'center',
        marginBottom: 30,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    email: {
        fontSize: 16,
        marginTop: 4,
    },
    menuContainer: {
        width: '90%',
    },
    menuItem: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 8,
        borderRadius: 8,
    },
    menuItemText: {
        fontSize: 16,
    },
    logoutButton: {
        paddingVertical: 16,
        paddingHorizontal: 8,
        marginTop: 16,
        borderRadius: 30,
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});