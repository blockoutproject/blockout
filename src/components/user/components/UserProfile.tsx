import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import type { CustomUser } from "@/src/types/User";
import { withAlpha } from "@/src/utils/utils";

type Props = { user: CustomUser };

const AVATAR_SIZE = 120;

const UserProfile: React.FC<Props> = ({ user }) => {
    const theme = useAppTheme();
    const avatar = user.pictureUrl
        ? { uri: user.pictureUrl }
        : require("@/assets/users/default_user_avatar.png");

    const edge = 0.95;
    const mid = 0.0;

    return (
        <View style={styles.wrapper}>
            <Image source={avatar} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={60} />

            <LinearGradient
                pointerEvents="none"
                colors={[
                    withAlpha(theme.backgroundSecondary, edge),
                    withAlpha(theme.backgroundSecondary, mid),
                    withAlpha(theme.backgroundSecondary, edge),
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                pointerEvents="none"
                colors={[
                    withAlpha(theme.backgroundSecondary, edge),
                    withAlpha(theme.backgroundSecondary, mid),
                    withAlpha(theme.backgroundSecondary, edge),
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                <View style={styles.avatarShadow}>
                    <View style={[styles.avatarMask, { backgroundColor: theme.text }]}>
                        <Image source={avatar} style={styles.avatar} contentFit="cover" />
                    </View>
                </View>

                <Text
                    style={[styles.title, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                >
                    {user.pseudo || "Utilisateur"}
                </Text>

                {user.email ? (
                    <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="email-outline" size={18} color={theme.textInactive} />
                        <Text
                            style={[styles.metaText, { color: theme.textInactive }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {user.email}
                        </Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
};

export default UserProfile;

const styles = StyleSheet.create({
    wrapper: {
        overflow: "hidden",
        borderRadius: 18,
    },
    content: {
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 24,
    },
    avatarShadow: {
        borderRadius: AVATAR_SIZE / 2 + 6,
        shadowColor: "#000",
        shadowOpacity: 0.6,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    avatarMask: {
        width: AVATAR_SIZE,
        aspectRatio: 1,
        borderRadius: AVATAR_SIZE / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    avatar: {
        width: "100%",
        height: "100%",
    },
    title: {
        textAlign: "center",
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: 0.2,
        paddingHorizontal: 24,
    },
    metaRow: {
        marginTop: 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
    },
    metaText: {
        fontSize: 14,
        fontWeight: "600",
    },
});