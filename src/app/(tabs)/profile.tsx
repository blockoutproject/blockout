import React, { useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Pressable, Alert, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useSession } from "@/src/context/SessionProvider";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import { ReportType } from "@/src/types/Report";
import { withAlpha } from "@/src/utils/utils";
import BottomSheetCustomPage from "@/src/components/common/bottomSheet/BottomSheetCustomPage";
import LegalDocumentScreen from "@/src/components/user/LegalDocumentScreen";
import ProfileHero from "@/src/components/user/ProfileHero";
import ProfileHeader from "@/src/components/user/ProfileHeader";
import ProfileFormSheet from "@/src/components/user/ProfileFormSheet";
import ReportFormSheet from "@/src/components/report/ReportFormSheet";
import { BOTTOM_TABBAR_HEIGHT, SECTION_SEPARATOR_HEIGHT } from "@/src/theme/globals";
import { useApis } from "@/src/context/ApiProvider";
import GuestUpsellCard from "@/src/components/user/GuestUpsellCard";
import { useOnboardingStore } from "@/src/utils/onboardingStore";

const SPINNER_BOX = 18;

const ProfileScreen: React.FC = () => {
    const { mobile } = useApis();
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { refetch, customUser, isGuest, signOutSSO } = useSession();
    const { allowed: canEdit } = useHasScopes(["update:current_user"]);
    const version = Application.nativeApplicationVersion ?? "1.0.0";
    const { resetOnboarding } = useOnboardingStore();

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const busy = isLoggingOut || isDeleting;

    const imprintRef = useRef<BottomSheetModal>(null);
    const termsRef = useRef<BottomSheetModal>(null);
    const privacyRef = useRef<BottomSheetModal>(null);
    const formSheetRef = useRef<BottomSheetModal>(null);
    const reportSheetRef = useRef<BottomSheetModal>(null);

    const openLocal = (ref: React.RefObject<BottomSheetModal | null>) => () => {
        Haptics.selectionAsync();
        ref.current?.present();
    };
    const dismissLocal = (ref: React.RefObject<BottomSheetModal | null>) => () => ref.current?.dismiss();

    const openForm = () => {
        if (!customUser) return;
        Haptics.selectionAsync();
        formSheetRef.current?.present();
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        Haptics.selectionAsync();
        await signOutSSO();
        resetOnboarding();
        setIsLoggingOut(false);
    };

    const handleDeleteAccount = async () => {
        Haptics.selectionAsync();
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
                            await signOutSSO();
                            await mobile.deleteCurrentUser();
                            resetOnboarding();
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch {
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
            testID={`legal-item-${label}`}
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

    // === GUEST MODE: pas de Hero, pas d’actions compte — on garde Légal + Upsell ===
    if (isGuest) {
        return (
            <View style={styles.container} testID="profile-screen">
                <ProfileHeader title="Profil" onOpenReport={() => reportSheetRef.current?.present()} />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { backgroundColor: theme.background, paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT + SECTION_SEPARATOR_HEIGHT + 4 },
                    ]}
                >
                    {/* Upsell card */}
                    <GuestUpsellCard />

                    {/* Section Légal conservée */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: withAlpha(theme.text, 0.7) }]}>Légal</Text>
                        <View style={styles.cardList}>
                            <LegalItemRow icon="file-document-outline" label="Mentions légales" onPress={openLocal(imprintRef)} />
                            <LegalItemRow icon="script-text-outline" label="Conditions d'utilisation" onPress={openLocal(termsRef)} />
                            <LegalItemRow icon="shield-lock-outline" label="Politique de confidentialité" onPress={openLocal(privacyRef)} />
                        </View>
                    </View>

                    {/* Version app */}
                    <View style={{ alignItems: "center", marginTop: 10 }}>
                        <Text style={[styles.versionText, { color: theme.textInactive }]}>Version {version}</Text>
                    </View>
                </ScrollView>

                {/* Bottom sheets légales */}
                <BottomSheetCustomPage ref={imprintRef}>
                    <LegalDocumentScreen type="imprint" title="Mentions Légales" onCloseSheet={dismissLocal(imprintRef)} />
                </BottomSheetCustomPage>
                <BottomSheetCustomPage ref={termsRef}>
                    <LegalDocumentScreen type="terms" title="Conditions Générales d'Utilisation" onCloseSheet={dismissLocal(termsRef)} />
                </BottomSheetCustomPage>
                <BottomSheetCustomPage ref={privacyRef}>
                    <LegalDocumentScreen type="privacy" title="Politique de Confidentialité" onCloseSheet={dismissLocal(privacyRef)} />
                </BottomSheetCustomPage>

                {/* Report */}
                <ReportFormSheet
                    ref={reportSheetRef}
                    context={{ screen: "Profile", defaultType: ReportType.DISPLAY_BUG }}
                    onSuccess={() => {
                        reportSheetRef.current?.dismiss();
                    }}
                    snapPoint="90%"
                    footerLabel="Envoyer"
                />
            </View>
        );
    }

    // === AUTH MODE: profil complet ===
    const renderBody = () => {
        if (!customUser) {
            return (
                <View style={[styles.center, { backgroundColor: theme.background }]}>
                    <ActivityIndicator size="large" color={theme.text} />
                </View>
            );
        }

        return (
            <>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { backgroundColor: theme.background, paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT + SECTION_SEPARATOR_HEIGHT + 4 },
                    ]}
                    testID="club-scroll"
                >
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
                            <Pressable
                                onPress={isLoggingOut ? undefined : handleLogout}
                                disabled={busy}
                                android_ripple={{ color: withAlpha("#000", 0.05) }}
                                style={({ pressed }) => [
                                    styles.btnFilledDanger,
                                    {
                                        backgroundColor: pressed && !busy ? withAlpha(theme.error, 0.9) : theme.error,
                                        opacity: busy ? 0.75 : 1,
                                    },
                                ]}
                                testID="logout-btn"
                            >
                                <View style={styles.btnInner}>
                                    <View style={styles.spinnerBox}>{isLoggingOut ? <ActivityIndicator size="small" color={theme.text} /> : null}</View>
                                    <Text style={[styles.buttonText, { color: theme.text }]}>{isLoggingOut ? "Déconnexion…" : "Se déconnecter"}</Text>
                                </View>
                            </Pressable>

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
                                testID="delete-account-btn"
                            >
                                <View style={styles.btnInner}>
                                    <View style={styles.spinnerBox}>{isDeleting ? <ActivityIndicator size="small" color={theme.error} /> : null}</View>
                                    <Text style={[styles.buttonText, { color: theme.error }]}>{isDeleting ? "Suppression…" : "Supprimer mon compte"}</Text>
                                </View>
                            </Pressable>

                            <View style={styles.version}>
                                <Text style={[styles.versionText, { color: theme.textInactive }]}>Version {version}</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <BottomSheetCustomPage ref={imprintRef}>
                    <LegalDocumentScreen type="imprint" title="Mentions Légales" onCloseSheet={dismissLocal(imprintRef)} />
                </BottomSheetCustomPage>
                <BottomSheetCustomPage ref={termsRef}>
                    <LegalDocumentScreen type="terms" title="Conditions Générales d'Utilisation" onCloseSheet={dismissLocal(termsRef)} />
                </BottomSheetCustomPage>
                <BottomSheetCustomPage ref={privacyRef}>
                    <LegalDocumentScreen type="privacy" title="Politique de Confidentialité" onCloseSheet={dismissLocal(privacyRef)} />
                </BottomSheetCustomPage>

                <ProfileFormSheet
                    ref={formSheetRef}
                    user={customUser}
                    onSuccess={() => {
                        refetch();
                        formSheetRef.current?.dismiss();
                    }}
                />

                <ReportFormSheet
                    ref={reportSheetRef}
                    context={{ screen: "Profile", defaultType: ReportType.DISPLAY_BUG }}
                    onSuccess={() => {
                        reportSheetRef.current?.dismiss();
                    }}
                    snapPoint="90%"
                    footerLabel="Envoyer"
                />
            </>
        );
    };

    return (
        <View style={styles.container} testID="profile-screen">
            <ProfileHeader title="Profil" onOpenReport={() => reportSheetRef.current?.present()} />
            {renderBody()}
        </View>
    );
};

export default ProfileScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    scrollContent: { paddingHorizontal: 8, gap: 20 },
    section: { gap: 12 },
    sectionTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },
    cardList: { gap: 10 },
    itemRow: {
        padding: 14,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    itemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
    itemText: { fontSize: 14, fontWeight: "700", flex: 1 },
    actions: { gap: 12, marginTop: 4 },
    btnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
    spinnerBox: { width: SPINNER_BOX, height: SPINNER_BOX, alignItems: "center", justifyContent: "center" },
    btnFilledDanger: { paddingVertical: 14, borderRadius: 999, alignItems: "center", flexDirection: "row", justifyContent: "center" },
    btnOutlineDanger: { paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1, flexDirection: "row", justifyContent: "center" },
    buttonText: { fontSize: 14, fontWeight: "800" },
    version: { alignItems: "center", marginTop: 2 },
    versionText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
});