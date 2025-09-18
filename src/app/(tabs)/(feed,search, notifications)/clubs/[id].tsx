import React, { useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useClubById } from "@/src/hooks/club/useClubById";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import BottomSheetCustomModal from "@/src/components/common/bottomSheet/BottomSheetCustomModal";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import ReportForm from "@/src/components/report/ReportForm";
import ClubForm from "@/src/components/club/ClubForm";
import ClubHeader from "@/src/components/club/ClubHeader";
import ClubHero from "@/src/components/club/ClubHero";
import { InfoCard, InfoRow } from "@/src/components/club/ClubInfoCard";
import ClubSkeleton from "@/src/components/club/ClubSkeleton";
import { ReportType } from "@/src/types/Report";
import { BOTTOM_TABBAR_HEIGHT, SECTION_SEPARATOR_HEIGHT } from "@/src/theme/globals";

type ClubScreenProps = {
    /** Called when the header asks to close the sheet. */
    onCloseSheet: () => void;
};

const ClubScreen: React.FC<ClubScreenProps> = ({ onCloseSheet }) => {
    const { id } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const { data: club, isLoading, error, refetch } = useClubById(String(id));

    const formSheetRef = useRef<BottomSheetModal>(null);
    const reportSheetRef = useRef<BottomSheetModal>(null);
    const { allowed: canUpdateClub } = useHasScopes(["update:clubs"]);

    const openForm = () => {
        if (!club) {
            return;
        }
        Haptics.selectionAsync();
        formSheetRef.current?.present();
    };

    const closeForm = () => {
        formSheetRef.current?.dismiss();
    };

    const openWebsite = () => {
        if (!club?.website) {
            return;
        }
        const url = club.website.startsWith("http") ? club.website : `https://${club.website}`;
        Linking.openURL(url);
    };

    const openMail = () => {
        if (!club?.email) {
            return;
        }
        Linking.openURL(`mailto:${club.email}`);
    };

    const openPhone = () => {
        if (!club?.phoneNumber) {
            return;
        }
        Linking.openURL(`tel:${club.phoneNumber}`);
    };

    const openMap = () => {
        if (!club) {
            return;
        }
        const query = encodeURIComponent(`${club.name}${club.city ? " " + club.city : ""}`);
        Linking.openURL(`https://maps.google.com/?q=${query}`);
    };

    let body: React.ReactNode;

    if (isLoading) {
        body = (
            <ClubSkeleton />
        );
    } else if (error) {
        body = (
            <ErrorState
                subtitle="Impossible de charger ce club."
                onRetry={refetch}
            />
        );
    } else if (!club) {
        body = (
            <ErrorState
                subtitle="Ce club est introuvable."
                onRetry={refetch}
            />
        );
    } else {
        const websiteDisplay = club.website ? club.website.replace(/^https?:\/\//, "") : null;

        body = (
            <>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            backgroundColor: theme.background,
                            paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT + SECTION_SEPARATOR_HEIGHT,
                        },
                    ]}
                    testID="club-scroll"
                >
                    <ClubHero
                        club={club}
                        onEdit={canUpdateClub ? openForm : undefined}
                    />

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

                <BottomSheetCustomModal
                    ref={formSheetRef}
                    snapPoint={"90%"}
                >
                    <ClubForm
                        club={club}
                        onSuccess={async () => {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            refetch();
                            closeForm();
                        }}
                    />
                </BottomSheetCustomModal>
            </>
        );
    }

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.background,
                },
            ]}
            testID="club-screen"
        >
            <ClubHeader
                title={club?.name ?? ""}
                onCloseSheet={onCloseSheet}
                onOpenReport={() => reportSheetRef.current?.present()}
            />
            {body}
            <BottomSheetCustomModal
                ref={reportSheetRef}
                snapPoint={"90%"}
            >
                <ReportForm
                    context={{
                        screen: "Club",
                        defaultType: ReportType.DISPLAY_BUG,
                    }}
                    onSuccess={() => {
                        reportSheetRef.current?.dismiss();
                    }}
                />
            </BottomSheetCustomModal>
        </View>
    );
};

export default ClubScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 4,
        gap: 20,
    },
});