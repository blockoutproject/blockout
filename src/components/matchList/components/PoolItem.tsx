import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";
import MaskedImage from "../../common/MaskedImage";
import MatchRow from "./MatchRow";
import GradientBorderView from "@/src/components/common/GradientBorderView";

type PoolItemProps = {
    enrichedPoolMatches: EnrichedPoolMatchesDTO;
    handlePoolPress: (id: number) => void;
    handleMatchPress: (id: number) => void;
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
                            blurRadius={40}
                        />

                        <LinearGradient
                            pointerEvents="none"
                            colors={[
                                withAlpha(theme.surface, 0.9),
                                withAlpha(theme.surface, 0.4),
                                withAlpha(theme.surface, 0.9),
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
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={20}
                                color={withAlpha(theme.text, 0.8)}
                            />
                        </View>
                    </TouchableOpacity>
                )}

                <View style={styles.matchList}>
                    {enrichedPoolMatches.matches.map((enrichedMatch) => (
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
    );
};

export default PoolItem;

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS,
    },
    innerClip: {
        borderRadius: RADIUS - 1, // évite de rogner le dégradé
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