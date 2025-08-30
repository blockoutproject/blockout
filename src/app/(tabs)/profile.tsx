import React, { useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Application from "expo-application";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useSession } from "@/src/context/SessionProvider";
import UsersApi from "@/src/api/UsersApi";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import ReportForm from "@/src/components/report/ReportForm";
import { ReportType } from "@/src/types/Report";
import { withAlpha } from "@/src/utils/utils";
import BottomSheetCustomPage from "@/src/components/common/BottomSheetCustomPage";
import LegalDocumentScreen from "@/src/components/user/LegalDocumentScreen";
import BottomSheetCustomModal from "@/src/components/common/BottomSheetCustomModal";
import ProfileHero from "@/src/components/user/components/ProfileHero";
import ProfileForm from "@/src/components/user/components/ProfileForm";
import ProfileHeader from "@/src/components/user/components/ProfileHeader";
import { ScrollView } from "react-native-gesture-handler";

const ProfileScreen: React.FC = () => {
    const { refetch, customUser } = useSession();
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { signOutSSO } = useSession();
    const { allowed: canEdit } = useHasScopes(["update:current_user"]);
    const version = Application.nativeApplicationVersion ?? "1.0.0";

    // état pour loaders
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const busy = isLoggingOut || isDeleting;

    const imprintRef = useRef<BottomSheetModal>(null);
    const termsRef = useRef<BottomSheetModal>(null);
    const privacyRef = useRef<BottomSheetModal>(null);
    const formSheetRef = useRef<BottomSheetModal>(null);
    const reportSheetRef = useRef<BottomSheetModal>(null);

    const openLocal = (ref: React.RefObject<BottomSheetModal | null>) => () => {
        void Haptics.selectionAsync();
        ref.current?.present();
    };
    const dismissLocal = (ref: React.RefObject<BottomSheetModal | null>) => () => ref.current?.dismiss();

    const openForm = () => {
        if (!customUser) return;
        void Haptics.selectionAsync();
        formSheetRef.current?.present();
    };
    const closeForm = () => formSheetRef.current?.dismiss();

    // Logout avec loader
    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            void Haptics.selectionAsync();
            await signOutSSO();
        } catch (e) {
            console.log("Erreur lors de la déconnexion :", e);
        } finally {
            setIsLoggingOut(false);
        }
    };

    // Confirmation + suppression avec loader
    const handleDeleteAccount = async () => {
        await Haptics.selectionAsync();
        Alert.alert(
            "Supprimer mon compte",
            "Cette action est irréversible. Toutes vos données de compte seront supprimées. Confirmez-vous la suppression ?",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            await UsersApi.getInstance().deleteCurrentUser();
                            await signOutSSO();
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (e) {
                            console.log("Erreur suppression compte :", e);
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

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
            <Ionicons name="chevron-forward-outline" size={20} color={withAlpha(theme.text, 0.5)} />
        </Pressable>
    );

    let body: React.ReactNode;
    if (!customUser) {
        body = (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.text} />
            </View>
        );
    } else {
        body = (
            <>
                <View style={styles.content} >
                    <ProfileHero user={customUser} onEdit={canEdit ? openForm : undefined} />

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: withAlpha(theme.text, 0.7) }]}>Légal</Text>
                        <View style={styles.cardList}>
                            <LegalItemRow icon="file-document-outline" label="Mentions légales" onPress={openLocal(imprintRef)} />
                            <LegalItemRow icon="script-text-outline" label="Conditions d'utilisation" onPress={openLocal(termsRef)} />
                            <LegalItemRow icon="shield-lock-outline" label="Politique de confidentialité" onPress={openLocal(privacyRef)} />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: withAlpha(theme.text, 0.7) }]}>Compte</Text>

                        <View style={styles.actions}>
                            {/* Bouton Déconnexion avec loader */}
                            <Pressable
                                onPress={isLoggingOut ? undefined : handleLogout}
                                disabled={busy}
                                android_ripple={{ color: withAlpha("#000", 0.05) }}
                                style={({ pressed }) => [
                                    styles.btnFilledDanger,
                                    { backgroundColor: pressed && !busy ? withAlpha(theme.error, 0.9) : theme.error, opacity: busy ? 0.75 : 1 },
                                ]}
                            >
                                {isLoggingOut ? (
                                    <>
                                        <ActivityIndicator size="small" color={theme.text} />
                                        <Text style={[styles.buttonText, { color: theme.text }]}>Déconnexion…</Text>
                                    </>
                                ) : (
                                    <Text style={[styles.buttonText, { color: theme.text }]}>Se déconnecter</Text>
                                )}
                            </Pressable>

                            {/* Bouton Suppression avec loader + confirmation */}
                            <Pressable
                                onPress={isDeleting ? undefined : handleDeleteAccount}
                                disabled={busy}
                                android_ripple={{ color: withAlpha(theme.error, 0.08) }}
                                style={({ pressed }) => [
                                    styles.btnOutlineDanger,
                                    {
                                        borderColor: theme.error,
                                        backgroundColor: pressed && !busy ? withAlpha(theme.error, 0.08) : "transparent",
                                        opacity: busy ? 0.75 : 1,
                                    },
                                ]}
                            >
                                {isDeleting ? (
                                    <>
                                        <ActivityIndicator size="small" color={theme.error} />
                                        <Text style={[styles.buttonText, { color: theme.error }]}>Suppression…</Text>
                                    </>
                                ) : (
                                    <Text style={[styles.buttonText, { color: theme.error }]}>Supprimer mon compte</Text>
                                )}
                            </Pressable>

                            <View style={styles.version}>
                                <Text style={[styles.versionText, { color: theme.textInactive }]}>Version {version}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <BottomSheetCustomPage ref={imprintRef}>
                    <LegalDocumentScreen type="imprint" title="Mentions Légales" onCloseSheet={dismissLocal(imprintRef)} />
                </BottomSheetCustomPage>

                <BottomSheetCustomPage ref={termsRef}>
                    <LegalDocumentScreen type="terms" title="Conditions Générales d'Utilisation" onCloseSheet={dismissLocal(termsRef)} />
                </BottomSheetCustomPage>

                <BottomSheetCustomPage ref={privacyRef}>
                    <LegalDocumentScreen type="privacy" title="Politique de Confidentialité" onCloseSheet={dismissLocal(privacyRef)} />
                </BottomSheetCustomPage>

                <BottomSheetCustomModal
                    ref={formSheetRef}
                    snapPoint={"90%"}
                >
                    <ProfileForm
                        user={customUser}
                        onSuccess={async () => {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            refetch();
                            closeForm();
                        }}
                    />
                </BottomSheetCustomModal>

                <BottomSheetCustomModal
                    ref={reportSheetRef}
                    snapPoint={"90%"}
                >
                    <ReportForm
                        context={{
                            screen: "Profile",
                            defaultType: ReportType.DISPLAY_BUG,
                        }}
                        onSuccess={() => {
                            reportSheetRef.current?.dismiss();
                        }}
                    />
                </BottomSheetCustomModal>
            </>
        );
    }

    return (
        <View style={styles.container}>
            <ProfileHeader
                title="Profil"
                onOpenReport={() => reportSheetRef.current?.present()}
            />
            {body}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    content: { paddingHorizontal: 12, gap: 20 },

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
    btnFilledDanger: { paddingVertical: 14, borderRadius: 999, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 },
    btnOutlineDanger: { paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1, flexDirection: "row", justifyContent: "center", gap: 10 },
    buttonText: { fontSize: 14, fontWeight: "800" },

    version: { alignItems: "center", marginTop: 2 },
    versionText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
});

export default ProfileScreen;