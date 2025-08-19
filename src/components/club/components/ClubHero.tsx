import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import type { Club } from "@/src/types/Club";
import { withAlpha } from "@/src/utils/utils";
import MaskedImage from "../../common/MaskedImage";

type ClubHeroProps = { club: Club };

const LOGO_SIZE = 120;

const ClubHero: React.FC<ClubHeroProps> = ({ club }) => {
    const theme = useAppTheme();
    const logo = club.logoUrl ? { uri: club.logoUrl } : require("@/assets/clubs/default_club_logo.png");

    const edge = 0.95;
    const mid = 0.0;

    return (
        <View style={styles.wrapper}>
            <Image source={logo} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={60} />

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
                <MaskedImage uri={club.logoUrl} size={LOGO_SIZE} radius={24} shadow />

                <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                    {club.name}
                </Text>

                {club.city ? (
                    <View style={styles.locationRow}>
                        <MaterialCommunityIcons name="map-marker" size={18} color={theme.textInactive} />
                        <Text style={[styles.city, { color: theme.textInactive }]} numberOfLines={1}>
                            {club.city}
                        </Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
};

export default ClubHero;

const styles = StyleSheet.create({
    wrapper: {
        overflow: "hidden",
        borderRadius: 18,
    },
    content: {
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 8,
        paddingVertical: 24,
    },
    title: {
        textAlign: "center",
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: 0.2,
        paddingHorizontal: 24,
    },
    locationRow: {
        marginTop: 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    city: {
        fontSize: 14,
        fontWeight: "600",
    },
});