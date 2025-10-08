import React, { useEffect } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";
import MaskedImage from "../common/images/MaskedImage";
import MatchRow from "./MatchRow";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import FadeIn from "../common/animations/FadeIn";
import { SECTION_SEPARATOR_HEIGHT } from "@/src/theme/globals";
import { useMappingHelper } from "@shopify/flash-list";
import { GenderLabels } from "@/src/types/enums/Gender";

/** Carte listant les matchs d’une poule. */
export type PoolItemProps = {
    /** Données enrichies de la poule + matches. */
    enrichedPoolMatches: EnrichedPoolMatchesDTO;
    /** Callback ouverture de la poule. */
    handlePoolPress: (id: number) => void;
    /** Callback ouverture d’un match. */
    handleMatchPress: (id: number) => void;
    /** Affiche l’en-tête cliquable de la poule. */
    showHeader?: boolean;
};

const RADIUS = 16;

const PoolItem: React.FC<PoolItemProps> = ({
    enrichedPoolMatches,
    handlePoolPress,
    handleMatchPress,
    showHeader = true,
}) => {
    const theme = useAppTheme();
    const { getMappingKey } = useMappingHelper();
    const division = enrichedPoolMatches.pool.division;
    const isRegional = !["ABCCS", "AALNV"].includes(enrichedPoolMatches.pool.leagueCode);

    const divisionLogo = division.logoUrl
        ? { uri: division.logoUrl }
        : require("@/assets/clubs/default_club_logo.png");

    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;

    return (
        <FadeIn >
            <View style={styles.wrapper}>
                <GradientBorderView
                    gradient={gradient}
                    borderRadius={RADIUS}
                    borderWidth={1}
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.surface,
                        },
                    ]}
                >
                    <View
                        style={styles.innerClip}
                    >
                        {showHeader ? (
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => handlePoolPress(enrichedPoolMatches.pool.id)}
                                hitSlop={{
                                    top: 8,
                                    right: 8,
                                    bottom: 8,
                                    left: 8,
                                }}
                            >
                                <Image
                                    source={divisionLogo}
                                    style={StyleSheet.absoluteFill}
                                    contentFit="cover"
                                    blurRadius={60}
                                />

                                <LinearGradient
                                    pointerEvents="none"
                                    colors={[
                                        withAlpha(theme.surface, 0.8),
                                        withAlpha(theme.surface, 0.5),
                                        withAlpha(theme.surface, 0.8),
                                    ]}
                                    locations={[
                                        0,
                                        0.5,
                                        1,
                                    ]}
                                    start={{
                                        x: 0,
                                        y: 0.5,
                                    }}
                                    end={{
                                        x: 1,
                                        y: 0.5,
                                    }}
                                    style={StyleSheet.absoluteFill}
                                />

                                <View
                                    style={styles.headerRow}
                                >
                                    <MaskedImage
                                        uri={division.logoUrl}
                                        size={22}
                                        radius={6}
                                        shadow={false}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={[
                                                styles.poolTitle,
                                                {
                                                    color: theme.text,
                                                },
                                            ]}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                        >
                                            {enrichedPoolMatches.pool.name}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.divisionTitle,
                                                {
                                                    color: theme.textSecondary,
                                                },
                                            ]}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                        >
                                            {`${isRegional ? `${enrichedPoolMatches.pool.leagueName} • ` : ''}${enrichedPoolMatches.pool.division.name} • ${GenderLabels[enrichedPoolMatches.pool.gender]}`}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward-outline"
                                        size={20}
                                        color={withAlpha(theme.text, 0.8)}
                                    />
                                </View>
                            </TouchableOpacity>
                        ) : null}

                        <View
                            style={styles.matchList}
                        >
                            {enrichedPoolMatches.matches.map((enrichedMatch, index) => (
                                <TouchableOpacity
                                    key={getMappingKey(enrichedMatch.id, index)}
                                    activeOpacity={0.85}
                                    onPress={() => handleMatchPress(enrichedMatch.id)}
                                >
                                    <MatchRow
                                        enrichedMatch={enrichedMatch}
                                        division={division}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </GradientBorderView>
            </View>
        </FadeIn>
    );
};

export default React.memo(PoolItem);

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: SECTION_SEPARATOR_HEIGHT,
    },
    card: {
        borderRadius: RADIUS,
    },
    innerClip: {
        borderRadius: RADIUS - 1,
        overflow: "hidden",
    },
    headerRow: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    poolTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: "800",
        flexShrink: 1
    },
    divisionTitle: {
        flex: 1,
        fontSize: 11,
        fontWeight: "600",
    },
    matchList: {
        padding: 8,
        gap: 8,
        backgroundColor: "transparent",
    },
});