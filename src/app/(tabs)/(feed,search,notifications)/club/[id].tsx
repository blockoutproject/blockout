import React, { useRef } from "react";
import { ScrollView, StyleSheet, View, Pressable, Text } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";

import { useClubById } from "@/src/hooks/club/useClubById";
import useHasScopes from "@/src/hooks/user/useHasScopes";

import ErrorState from "@/src/components/common/feedback/ErrorState";
import ClubFormSheet from "@/src/components/club/ClubFormSheet";
import ClubHeader from "@/src/components/club/ClubHeader";
import ClubHero from "@/src/components/club/ClubHero";
import { InfoCard, InfoRow } from "@/src/components/club/ClubInfoCard";
import ClubSkeleton from "@/src/components/club/ClubSkeleton";
import { ReportType } from "@/src/types/Report";
import {
    BOTTOM_TABBAR_HEIGHT,
    SECTION_SEPARATOR_HEIGHT,
} from "@/src/theme/globals";
import ReportFormSheet from "@/src/components/report/ReportFormSheet";

const ClubScreen: React.FC = () => {
    const { id } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const router = useRouter();
    const { data: club, isLoading, error, refetch } = useClubById(String(id));
    const { allowed: canUpdateClub } = useHasScopes(["update:clubs"]);

    const formSheetRef = useRef<BottomSheetModal>(null);
    const reportSheetRef = useRef<BottomSheetModal>(null);

    const openForm = () => {
        if (!club) return;
        Haptics.selectionAsync();
        formSheetRef.current?.present();
    };
    const closeForm = () => formSheetRef.current?.dismiss();

    const openWebsite = () => {
        if (!club?.website) return;
        const url = club.website.startsWith("http")
            ? club.website
            : `https://${club.website}`;
        Linking.openURL(url);
    };
    const openMail = () => {
        if (!club?.email) return;
        Linking.openURL(`mailto:${club.email}`);
    };
    const openPhone = () => {
        if (!club?.phoneNumber) return;
        Linking.openURL(`tel:${club.phoneNumber}`);
    };
    const openMap = () => {
        if (!club) return;
        const query = encodeURIComponent(
            `${club.name}${club.city ? " " + club.city : ""}`
        );
        Linking.openURL(`https://maps.google.com/?q=${query}`);
    };

    const handleOpenTeamList = () => {
        Haptics.selectionAsync();
        router.push(`/team-list/${club?.id}`);
    };

    let body: React.ReactNode;

    if (isLoading) {
        body = <ClubSkeleton />;
    } else if (error) {
        body = (
            <ErrorState subtitle="Impossible de charger ce club." onRetry={refetch} />
        );
    } else if (!club) {
        body = (
            <ErrorState subtitle="Ce club est introuvable." onRetry={refetch} />
        );
    } else {
        const websiteDisplay = club.website
            ? club.website.replace(/^https?:\/\//, "")
            : null;

        body = (
            <>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            backgroundColor: theme.background,
                            paddingBottom:
                                insets.bottom +
                                BOTTOM_TABBAR_HEIGHT +
                                SECTION_SEPARATOR_HEIGHT +
                                4,
                        },
                    ]}
                    testID="club-scroll"
                >
                    <ClubHero
                        club={club}
                        onEdit={canUpdateClub ? openForm : undefined}
                    />

                    <Pressable
                        onPress={handleOpenTeamList}
                        android_ripple={{
                            color: withAlpha(theme.text, 0.05),
                        }}
                        style={({ pressed }) => [
                            styles.teamsCard,
                            {
                                backgroundColor: theme.surface,
                                borderColor: withAlpha(theme.text, 0.12),
                            },
                            pressed
                                ? { backgroundColor: withAlpha(theme.text, 0.02) }
                                : null,
                        ]}
                        testID="club-teams-button"
                    >
                        <Text
                            style={[
                                styles.teamsLabel,
                                {
                                    color: theme.text,
                                },
                            ]}
                        >
                            Équipes
                        </Text>
                        <Ionicons
                            name="chevron-forward-outline"
                            size={20}
                            color={withAlpha(theme.text, 0.5)}
                        />
                    </Pressable>

                    {/* Coordonnées */}
                    <InfoCard title="Coordonnées">
                        <InfoRow
                            icon="email-outline"
                            label="Email"
                            value={club.email}
                            onPress={openMail}
                            isLink
                        />
                        <InfoRow
                            icon="phone-outline"
                            label="Téléphone"
                            value={club.phoneNumber}
                            onPress={openPhone}
                            isLink
                        />
                        <InfoRow
                            icon="link-variant"
                            label="Site web"
                            value={websiteDisplay}
                            onPress={openWebsite}
                            isLink
                        />
                    </InfoCard>

                    {/* Localisation */}
                    <InfoCard title="Localisation">
                        <InfoRow
                            icon="map-marker"
                            label="Ville"
                            value={club.city}
                        />
                        <InfoRow
                            icon="map-outline"
                            label="Voir sur la carte"
                            value="Ouvrir la carte"
                            onPress={openMap}
                            isLink
                        />
                    </InfoCard>
                </ScrollView>

                <ClubFormSheet
                    ref={formSheetRef}
                    club={club}
                    onSuccess={() => {
                        refetch();
                        closeForm();
                    }}
                    snapPoint="90%"
                    footerLabel="Enregistrer"
                />
            </>
        );
    }

    return (
        <View
            style={[styles.container, { backgroundColor: theme.background }]}
            testID="club-screen"
        >
            <ClubHeader
                title={club?.name ?? ""}
                onOpenReport={() => reportSheetRef.current?.present()}
            />
            {body}
            <ReportFormSheet
                ref={reportSheetRef}
                context={{
                    screen: "Club",
                    defaultType: ReportType.DISPLAY_BUG,
                }}
                onSuccess={() => {
                    reportSheetRef.current?.dismiss();
                }}
                snapPoint="90%"
                footerLabel="Envoyer"
            />
        </View>
    );
};

export default ClubScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 8, gap: 20 },
    teamsCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
    },
    teamsLabel: {
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.2,
    },
});