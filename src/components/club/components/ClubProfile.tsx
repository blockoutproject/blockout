import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Linking from "expo-linking";

import { useAppTheme } from "@/src/context/ThemeProvider";
import type { Club } from "@/src/types/Club";
import ClubHero from "./ClubHero";
import { InfoCard, InfoRow } from "./ClubInfoCard";

type ClubProfileProps = { club: Club };

const ClubProfile: React.FC<ClubProfileProps> = ({ club }) => {
    const theme = useAppTheme();

    const websiteDisplay = useMemo(() => {
        if (!club.website) return null;
        return club.website.replace(/^https?:\/\//, "");
    }, [club.website]);

    const openWebsite = () => {
        if (!club.website) return;
        const url = club.website.startsWith("http") ? club.website : `https://${club.website}`;
        Linking.openURL(url);
    };

    const openMail = () => {
        if (!club.email) return;
        Linking.openURL(`mailto:${club.email}`);
    };

    const openPhone = () => {
        if (!club.phoneNumber) return;
        Linking.openURL(`tel:${club.phoneNumber}`);
    };

    const openMap = () => {
        const query = encodeURIComponent(`${club.name}${club.city ? " " + club.city : ""}`);
        Linking.openURL(`https://maps.google.com/?q=${query}`);
    };

    return (
        <BottomSheetScrollView
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { backgroundColor: theme.background }]}
        >
            <ClubHero club={club} />

            <InfoCard title="Coordonnées">
                <InfoRow icon="email-outline" label="Email" value={club.email} onPress={openMail} isLink />
                <InfoRow icon="phone-outline" label="Téléphone" value={club.phoneNumber} onPress={openPhone} isLink />
                <InfoRow icon="link-variant" label="Site web" value={websiteDisplay} onPress={openWebsite} isLink />
            </InfoCard>

            <InfoCard title="Localisation">
                <InfoRow icon="map-marker" label="Ville" value={club.city} />
                <InfoRow icon="map-outline" label="Voir sur la carte" value="Ouvrir la carte" onPress={openMap} isLink />
            </InfoCard>
        </BottomSheetScrollView>
    );
};

export default ClubProfile;

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: 4,
        gap: 20,
    },
});