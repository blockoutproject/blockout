import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StyleSheet as RNStyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import type { Club } from "@/src/types/Club";
import { withAlpha } from "@/src/utils/utils";
import MaskedImage from "@/src/components/common/images/MaskedImage";

/** Hero section for club screen with blurred background and avatar. */
export type ClubHeroProps = {
    /** Club entity. */
    club: Club;
    /** Optional edit handler. */
    onEdit?: () => void;
};

const AVATAR_SIZE = 120;
const EDGE = 0.95;
const MID = 0.0;

const ClubHero: React.FC<ClubHeroProps> = ({ club, onEdit }) => {
    const theme = useAppTheme();
    const logo = club.logoUrl ? { uri: club.logoUrl } : require("@/assets/clubs/default_club_logo.png");

    return (
        <View
            style={styles.wrapper}
            testID="club-hero"
        >
            <Image
                source={logo}
                style={RNStyleSheet.absoluteFill}
                contentFit="cover"
                blurRadius={60}
            />
            <LinearGradient
                pointerEvents="none"
                colors={[
                    withAlpha(theme.backgroundSecondary, EDGE),
                    withAlpha(theme.backgroundSecondary, MID),
                    withAlpha(theme.backgroundSecondary, EDGE),
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={RNStyleSheet.absoluteFill}
            />
            <LinearGradient
                pointerEvents="none"
                colors={[
                    withAlpha(theme.backgroundSecondary, EDGE),
                    withAlpha(theme.backgroundSecondary, MID),
                    withAlpha(theme.backgroundSecondary, EDGE),
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={RNStyleSheet.absoluteFill}
            />

            {onEdit ? (
                <TouchableOpacity
                    onPress={onEdit}
                    activeOpacity={0.85}
                    style={[
                        styles.fab,
                        {
                            backgroundColor: withAlpha(theme.surface, 0.85),
                            borderColor: withAlpha(theme.text, 0.12),
                        },
                    ]}
                    hitSlop={{
                        top: 8,
                        right: 8,
                        bottom: 8,
                        left: 8,
                    }}
                    testID="club-hero-edit"
                >
                    <MaterialCommunityIcons
                        name="pencil-outline"
                        size={18}
                        color={theme.text}
                    />
                </TouchableOpacity>
            ) : null}

            <View
                style={styles.content}
            >
                <MaskedImage
                    uri={club.logoUrl}
                    size={AVATAR_SIZE}
                    radius={24}
                    shadow
                />

                <Text
                    style={[
                        styles.title,
                        {
                            color: theme.text,
                        },
                    ]}
                    numberOfLines={2}
                >
                    {club.name}
                </Text>

                {club.city ? (
                    <View
                        style={styles.metaRow}
                    >
                        <MaterialCommunityIcons
                            name="map-marker"
                            size={18}
                            color={theme.textInactive}
                        />
                        <Text
                            style={[
                                styles.metaText,
                                {
                                    color: theme.textInactive,
                                },
                            ]}
                            numberOfLines={1}
                        >
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
        position: "relative",
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
    metaRow: {
        marginTop: 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    metaText: {
        fontSize: 14,
        fontWeight: "600",
    },
    fab: {
        position: "absolute",
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        elevation: 4,
        zIndex: 5,
    },
});