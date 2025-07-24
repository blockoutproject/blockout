import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
} from "react-native";
import { BottomSheetScrollView, useBottomSheetModal } from "@gorhom/bottom-sheet";
import { useAuth0 } from "react-native-auth0";
import { Image } from 'expo-image';
import { useAppTheme } from "@/src/context/ThemeProvider";
import { router } from "expo-router";
import { useUserContext } from "@/src/context/UserProvider";

const ProfileScreen: React.FC = () => {
    const { user, clearSession } = useAuth0();
    const { customUser } = useUserContext();
    const theme = useAppTheme();

    const { dismissAll } = useBottomSheetModal();

    const handleLogout = async () => {
        try {
            await clearSession();
            dismissAll();
        } catch (error) {
            console.log("Erreur lors de la déconnexion :", error);
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
        <BottomSheetScrollView
            style={[styles.scrollContainer, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* --- Header --- */}
            <View style={styles.profileHeader}>
                {user.picture && (
                    <Image source={{ uri: user.picture }} style={styles.avatar} />
                )}
                <Text style={[styles.username, { color: theme.text }]}>
                    {customUser?.pseudo || "Utilisateur"}
                </Text>
                <Text style={[styles.email, { color: theme.textInactive }]}>
                    {user.email}
                </Text>
            </View>

            {/* --- Menu --- */}
            <View style={styles.menuContainer}>
                {[
                    { label: "Éditer mon profil", path: "/profile/edit" },
                    { label: "Changer mon mot de passe", path: "/profile/change-password" },
                    { label: "Notifications", path: "/profile/notifications" },
                    { label: "À propos", path: "/profile/about" },
                    { label: "Aide", path: "/profile/help" },
                ].map((item) => (
                    <Pressable
                        key={item.path}
                        style={[styles.menuItem, { backgroundColor: theme.backgroundSecondary }]}
                        onPress={() => router.push(item.path)}
                    >
                        <Text style={[styles.menuItemText, { color: theme.text }]}>{item.label}</Text>
                    </Pressable>
                ))}

                {/* --- Logout --- */}
                <Pressable
                    style={[styles.logoutButton, { backgroundColor: theme.error }]}
                    onPress={handleLogout}
                >
                    <Text style={[styles.logoutButtonText, { color: theme.text }]}>
                        Se déconnecter
                    </Text>
                </Pressable>
            </View>
        </BottomSheetScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: { 
        flex: 1 
    },
    contentContainer: { 
        alignItems: "center",
        paddingBottom: 40 
    },
    loadingContainer: { 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center" 
    },
    profileHeader: { 
        marginTop: 40, 
        alignItems: "center", 
        marginBottom: 30 
    },
    avatar: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        marginBottom: 16 
    },
    username: { 
        fontSize: 24, 
        fontWeight: "bold" 
    },
    email: { 
        fontSize: 14, 
        marginTop: 4 
    },
    menuContainer: { 
        width: "90%" 
    },
    menuItem: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 8,
        borderRadius: 8,
    },
    menuItemText: { fontSize: 14 },
    logoutButton: {
        paddingVertical: 16,
        marginTop: 16,
        borderRadius: 30,
        alignItems: "center",
    },
    logoutButtonText: { 
        fontSize: 14, 
        fontWeight: "bold" 
    },
});

export default ProfileScreen;