import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import type { CustomUser } from "@/src/types/User";
import { withAlpha } from "@/src/utils/utils";
import UserHero from "./UserHero";
import * as Application from "expo-application";
import { BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";

type UserProfileProps = {
    user: CustomUser;
    onEdit?: () => void;
    onOpenImprint: () => void;
    onOpenTerms: () => void;
    onOpenPrivacy: () => void;
    onLogout: () => void;
    onDeleteAccount: () => void;
};

const UserProfile: React.FC<UserProfileProps> = ({
    user,
    onEdit,
    onOpenImprint,
    onOpenTerms,
    onOpenPrivacy,
    onLogout,
    onDeleteAccount,
}) => {
    const theme = useAppTheme();
    const version = Application.nativeApplicationVersion ?? "1.0.0";

    const LegalItemRow: React.FC<{
        icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
        label: string;
        onPress: () => void;
    }> = ({ icon, label, onPress }) => (
        <Pressable
            onPress={onPress}
            android_ripple={{ color: withAlpha(theme.text, 0.06) }}
            style={({ pressed }) => [
                styles.itemRow,
                {
                    backgroundColor: pressed ? withAlpha(theme.surface, 0.9) : theme.surface,
                    borderColor: withAlpha(theme.text, 0.1),
                },
            ]}
        >
            <View style={styles.itemLeft}>
                <MaterialCommunityIcons name={icon} size={18} color={withAlpha(theme.text, 0.8)} />
                <Text style={[styles.itemText, { color: theme.text }]} numberOfLines={1}>
                    {label}
                </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={withAlpha(theme.text, 0.5)} />
        </Pressable>
    );

    return (
        <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
        >
            <UserHero user={user} onEdit={onEdit} />

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: withAlpha(theme.text, 0.7) }]}>Légal</Text>
                <View style={styles.cardList}>
                    <LegalItemRow icon="file-document-outline" label="Mentions légales" onPress={onOpenImprint} />
                    <LegalItemRow icon="script-text-outline" label="Conditions d'utilisation" onPress={onOpenTerms} />
                    <LegalItemRow icon="shield-lock-outline" label="Politique de confidentialité" onPress={onOpenPrivacy} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: withAlpha(theme.text, 0.7) }]}>Compte</Text>

                <View style={styles.actions}>
                    <Pressable
                        onPress={onLogout}
                        android_ripple={{ color: withAlpha("#000", 0.05) }}
                        style={({ pressed }) => [
                            styles.btnFilledDanger,
                            { backgroundColor: pressed ? withAlpha(theme.error, 0.9) : theme.error },
                        ]}
                    >
                        <Text style={[styles.buttonText, { color: theme.text }]}>Se déconnecter</Text>
                    </Pressable>

                    <Pressable
                        onPress={onDeleteAccount}
                        android_ripple={{ color: withAlpha(theme.error, 0.08) }}
                        style={({ pressed }) => [
                            styles.btnOutlineDanger,
                            {
                                borderColor: theme.error,
                                backgroundColor: pressed ? withAlpha(theme.error, 0.08) : "transparent",
                            },
                        ]}
                    >
                        <Text style={[styles.buttonText, { color: theme.error }]}>Supprimer mon compte</Text>
                    </Pressable>

                    <View style={styles.version}>
                        <Text style={[styles.versionText, { color: theme.textInactive }]}>Version {version}</Text>
                    </View>
                </View>
            </View>
        </BottomSheetScrollView>
    );
};

export default UserProfile;

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 4,
        gap: 20
    },
    section: { gap: 12 },
    sectionTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },
    cardList: { gap: 10 },

    itemRow: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    itemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
    itemText: { fontSize: 14, fontWeight: "700", flex: 1 },

    actions: { gap: 12, marginTop: 4 },
    btnFilledDanger: { paddingVertical: 14, borderRadius: 999, alignItems: "center" },
    btnOutlineDanger: { paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1 },
    buttonText: { fontSize: 14, fontWeight: "800" },

    version: { alignItems: "center", marginTop: 2 },
    versionText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
});