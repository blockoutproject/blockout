import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import FastImage from 'react-native-fast-image';
import { colors } from '@/src/constants/Colors';
import { router } from 'expo-router'; // si tu utilises expo-router

const ProfileScreen: React.FC = () => {
    const { user, clearSession } = useAuth0();

    const handleLogout = async () => {
        try {
            await clearSession();
        } catch (error) {
            console.log('Erreur lors de la déconnexion :', error);
        }
    };

    if (!user) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Aucun utilisateur n’est connecté.</Text>
            </View>
        );
    }

    return (
        <ScrollView 
            style={styles.scrollContainer} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* HEADER */}
            <View style={styles.profileHeader}>
                {user.picture && (
                    <FastImage source={{ uri: user.picture }} style={styles.avatar} />
                )}
                <Text style={styles.username}>{user.name || 'Utilisateur'}</Text>
                <Text style={styles.email}>{user.email}</Text>
            </View>

            {/* LISTE DE SECTIONS CLIQUABLES */}
            <View style={styles.menuContainer}>
                {/* Éditer le profil (nom, avatar) */}
                <Pressable
                    style={styles.menuItem}
                    onPress={() => router.push('/profile/edit')}
                // ou router.push('(protected)/profile/edit') selon ta structure
                >
                    <Text style={styles.menuItemText}>Éditer mon profil</Text>
                </Pressable>

                {/* Changer le mot de passe */}
                <Pressable
                    style={styles.menuItem}
                    onPress={() => router.push('/profile/change-password')}
                >
                    <Text style={styles.menuItemText}>Changer mon mot de passe</Text>
                </Pressable>

                {/* Notifications */}
                <Pressable
                    style={styles.menuItem}
                    onPress={() => router.push('/profile/notifications')}
                >
                    <Text style={styles.menuItemText}>Notifications</Text>
                </Pressable>

                {/* About */}
                <Pressable
                    style={styles.menuItem}
                    onPress={() => router.push('/profile/about')}
                >
                    <Text style={styles.menuItemText}>À propos</Text>
                </Pressable>

                {/* Help */}
                <Pressable
                    style={styles.menuItem}
                    onPress={() => router.push('/profile/help')}
                >
                    <Text style={styles.menuItemText}>Aide</Text>
                </Pressable>

                {/* Déconnexion */}
                <Pressable style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Se déconnecter</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
};

export default ProfileScreen;

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: colors.dark,
    },
    contentContainer: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    container: {
        flex: 1,
        backgroundColor: colors.dark,
        padding: 16,
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
        color: colors.light,
        fontSize: 24,
        fontWeight: 'bold',
    },
    email: {
        color: colors.light,
        fontSize: 16,
        marginTop: 4,
    },
    menuContainer: {
        width: '90%',
    },
    menuItem: {
        backgroundColor: colors.dark + '80',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 8,
        borderRadius: 8,
    },
    menuItemText: {
        color: colors.light,
        fontSize: 16,
    },
    logoutButton: {
        backgroundColor: colors.red,
        paddingVertical: 16,
        paddingHorizontal: 8,
        marginTop: 16,
        borderRadius: 30,
    },
    logoutButtonText: {
        color: colors.light,
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    errorText: {
        color: colors.light,
        fontSize: 16,
    },
});