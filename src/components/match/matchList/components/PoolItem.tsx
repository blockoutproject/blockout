import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import MatchCard from "./MatchCard";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientView from "@/src/components/common/GradientView";
import { th } from "date-fns/locale";
import GradientBorderView from "@/src/components/common/GradientBorderView";

interface PoolItemProps {
    pool: EnrichedPoolMatchesDTO;
    index: number;
    handlePoolPress: (poolId: number) => void;
    handleMatchPress: (matchId: number) => void;
    mainLeagueColors: string[];
    secondLeagueColors: string[];
}

const PoolItem: React.FC<PoolItemProps> = ({
    pool,
    index,
    handlePoolPress,
    handleMatchPress,
    mainLeagueColors,
    secondLeagueColors,
}) => {
    const theme = useAppTheme();
    const colorIndex = index % mainLeagueColors.length;

    return (
        <GradientBorderView style={[styles.container]} colorsOverride={[theme.border, theme.background]} >
            <TouchableOpacity onPress={() => handlePoolPress(pool.poolId)}>
                <View style={styles.poolHeader}>
                    <FastImage
                        source={require("@/assets/leagues/msl.png")}
                        style={styles.poolLogo}
                        resizeMode="contain"
                    />
                    <Text
                        style={[styles.poolTitle, { color: theme.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        adjustsFontSizeToFit
                        minimumFontScale={0.9}
                    >
                        {pool.poolData?.name ?? "Chargement..."}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={styles.matchesWrapper}>
                {pool.matches.map((match) => (
                    <TouchableOpacity
                        key={match.id}
                        onPress={() => handleMatchPress(match.id)}
                    >
                        <MatchCard
                            match={match}
                            teamA={match.teamA}
                            teamB={match.teamB}
                            mainColor={mainLeagueColors[colorIndex]}
                            secondColor={secondLeagueColors[colorIndex]}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        </GradientBorderView>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 18,
        padding: 10,
    },
    poolHeader: {
        marginBottom: 8,
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
    },
    poolLogo: {
        width: 22,
        height: 22,
        marginRight: 8,
        borderRadius: 8,
    },
    poolTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
    },
    matchesWrapper: {
        flexDirection: "column",
        gap: 12,
    },
});

export default PoolItem;