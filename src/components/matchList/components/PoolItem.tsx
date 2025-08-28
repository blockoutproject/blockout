import React, { useEffect, useRef } from "react";
import { Text, TouchableOpacity, View, StyleSheet, Animated } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";
import MaskedImage from "../../common/images/MaskedImage";
import MatchRow from "./MatchRow";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import FadeIn from "../../animations/FadeIn";

type PoolItemProps = {
    enrichedPoolMatches: EnrichedPoolMatchesDTO;
    handlePoolPress: (id: number) => void;
    handleMatchPress: (id: number) => void;
    showHeader?: boolean;
    appearIndex?: number;
    staggerBase?: number;
    staggerStep?: number;
};

const RADIUS = 16;

const PoolItem: React.FC<PoolItemProps> = ({
    enrichedPoolMatches,
    handlePoolPress,
    handleMatchPress,
    showHeader = true,
    appearIndex = 0,
    staggerBase = 0,
    staggerStep = 40,
}) => {
    const theme = useAppTheme();
    const division = enrichedPoolMatches.pool.division;

    const divisionLogo = division.logoUrl
        ? { uri: division.logoUrl }
        : require("@/assets/clubs/default_club_logo.png");

    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;

    return (
        <FadeIn appearIndex={appearIndex} >
            <GradientBorderView
                gradient={gradient}
                borderRadius={RADIUS}
                borderWidth={1}
                style={[styles.card, { backgroundColor: theme.surface }]}
            >
                <View style={styles.innerClip}>
                    {showHeader && (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => handlePoolPress(enrichedPoolMatches.pool.id)}
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
                                locations={[0, 0.5, 1]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.headerRow}>
                                <MaskedImage uri={division.logoUrl} size={22} radius={6} shadow={false} />
                                <Text
                                    style={[styles.poolTitle, { color: theme.text }]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {enrichedPoolMatches.pool.name}
                                </Text>
                                <Ionicons
                                    name="chevron-forward-outline"
                                    size={20}
                                    color={withAlpha(theme.text, 0.8)}
                                />
                            </View>
                        </TouchableOpacity>
                    )}

                    <View style={styles.matchList}>
                        {enrichedPoolMatches.matches.map((enrichedMatch, idx) => (
                            <TouchableOpacity
                                key={enrichedMatch.id}
                                activeOpacity={0.85}
                                onPress={() => handleMatchPress(enrichedMatch.id)}
                            >
                                <MatchRow enrichedMatch={enrichedMatch} division={division} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </GradientBorderView>
        </FadeIn>
    );
};

export default PoolItem;

const styles = StyleSheet.create({
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
    poolTitle: { flex: 1, fontSize: 14, fontWeight: "800" },
    matchList: {
        padding: 8,
        gap: 8,
        backgroundColor: "transparent",
    },
});