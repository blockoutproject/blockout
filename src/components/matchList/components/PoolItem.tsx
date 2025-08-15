import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";

import MatchCard from "./MatchCard";
import { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";
import { Mask } from "react-native-svg";
import MaskedImage from "../../common/MaskedImage";

type Props = {
    enrichedPoolMatches: EnrichedPoolMatchesDTO;
    handlePoolPress: (id: number) => void;
    handleMatchPress: (id: number) => void;
};

const PoolItem: React.FC<Props> = ({
    enrichedPoolMatches,
    handlePoolPress,
    handleMatchPress,
}) => {
    const theme = useAppTheme();

    const gradient: readonly [string, string, ...string[]] = [
        enrichedPoolMatches.pool.division.firstGradientColor,
        enrichedPoolMatches.pool.division.secondGradientColor,
        enrichedPoolMatches.pool.division.thirdGradientColor,
    ];

    const divisionLogo =
        enrichedPoolMatches.pool.division.logoUrl
            ? { uri: enrichedPoolMatches.pool.division.logoUrl }
            : require("@/assets/clubs/default_club_logo.png");

    return (
        <View
            style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handlePoolPress(enrichedPoolMatches.pool.id)}
            >
                <View style={styles.header}>
                    <Image
                        source={divisionLogo}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        blurRadius={40}
                    />
                    <LinearGradient
                        pointerEvents="none"
                        colors={[
                            withAlpha(theme.surface, 0.85),
                            withAlpha(theme.surface, 0.35),
                            withAlpha(theme.surface, 0.85),
                        ]}
                        locations={[0, 0.5, 1]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.headerRow}>
                        <MaskedImage
                            uri={enrichedPoolMatches.pool.division.logoUrl}
                            size={24}
                            radius={6}
                            shadow
                        />
                        <Text
                            style={[styles.poolTitle, { color: theme.text }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {enrichedPoolMatches.pool.name}
                        </Text>

                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={22}
                            color={withAlpha(theme.text, 0.8)}
                        />
                    </View>
                </View>
            </TouchableOpacity>

            <View style={styles.matchList}>
                {enrichedPoolMatches.matches.map((enrichedMatch) => (
                    <TouchableOpacity
                        key={enrichedMatch.id}
                        activeOpacity={0.85}
                        onPress={() => handleMatchPress(enrichedMatch.id)}
                    >
                        <MatchCard enrichedMatch={enrichedMatch} gradient={gradient} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

export default PoolItem;

const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: "hidden",
    },
    header: {
        position: "relative",
        overflow: "hidden",
        width: "100%",
    },
    headerRow: {
        paddingHorizontal: 10,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    poolTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: "800",
    },
    matchList: {
        padding: 8,
        gap: 10,
    },
});