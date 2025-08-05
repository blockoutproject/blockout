import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { useUserContext } from "@/src/context/UserProvider";
import { useAuth0 } from "react-native-auth0";
import { router } from "expo-router";
import UsersApi from "@/src/api/UsersApi";
import * as Haptics from "expo-haptics";
import { useSession } from "@/src/context/SessionProvider";

const ProfileScreen: React.FC = () => {
    const { user } = useAuth0();
    const { customUser } = useUserContext();
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { signOut } = useSession();

    const handleLogout = async () => {
        try {
            await Haptics.selectionAsync();
            await signOut();
        } catch (error) {
            console.log("Erreur lors de la déconnexion :", error);
        }
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            "Supprimer mon compte",
            "Cette action est irréversible. Es-tu sûr(e) ?",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            await UsersApi.getInstance().deleteCurrentUser();
                            await signOut();
                        } catch (error) {
                            console.log("Erreur suppression compte :", error);
                        }
                    },
                },
            ]
        );
    };

    if (!user) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.text} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
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

            <View style={styles.section}>
                {[
                    { label: "Éditer mon profil", path: "/profile/edit" },
                    { label: "Changer mon mot de passe", path: "/profile/change-password" },
                    { label: "Notifications", path: "/profile/notifications" },
                    { label: "À propos", path: "/profile/about" },
                    { label: "Aide", path: "/profile/help" },
                ].map((item) => (
                    <Pressable
                        key={item.path}
                        style={[styles.item, { backgroundColor: theme.surface }]}
                        onPress={() => router.push(item.path)}
                    >
                        <Text style={[styles.itemText, { color: theme.text }]}>{item.label}</Text>
                    </Pressable>
                ))}
            </View>

            <View style={styles.actions}>
                <Pressable
                    style={[styles.logoutButton, { backgroundColor: theme.error }]}
                    onPress={handleLogout}
                >
                    <Text style={[styles.buttonText, { color: theme.text }]}>
                        Se déconnecter
                    </Text>
                </Pressable>

                <Pressable
                    style={[styles.deleteButton, { borderColor: theme.error, borderWidth: 1 }]}
                    onPress={handleDeleteAccount}
                >
                    <Text style={[styles.buttonText, { color: theme.error }]}>
                        Supprimer mon compte
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 32,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        alignItems: "center",
        marginBottom: 32,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
    },
    username: {
        fontSize: 24,
        fontWeight: "bold",
    },
    email: {
        fontSize: 14,
        marginTop: 4,
    },
    section: {
        gap: 12,
        marginBottom: 32,
    },
    item: {
        padding: 16,
        borderRadius: 16,
    },
    itemText: {
        fontSize: 16,
        fontWeight: "500",
    },
    actions: {
        gap: 12,
    },
    logoutButton: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: "center",
    },
    deleteButton: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: "center",
    },
    buttonText: {
        fontSize: 14,
        fontWeight: "bold",
    },
});

export default ProfileScreen;