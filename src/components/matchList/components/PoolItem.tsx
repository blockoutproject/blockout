import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import MatchCard from "./MatchCard";
import { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";

type Props = {
    pool: EnrichedPoolMatchesDTO;
    index: number;
    handlePoolPress: (id: number) => void;
    handleMatchPress: (id: number) => void;
    mainLeagueColors: string[];
    secondLeagueColors: string[];
};

const PoolItem: React.FC<Props> = ({
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
        <GradientBorderView
            style={[styles.poolContainer, { backgroundColor: theme.surfaceSecondary }]}
            colorsOverride={[theme.background, theme.background]}
        >
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
                    >
                        {pool.poolData?.name ?? "Chargement..."}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={styles.matchList}>
                {pool.matches.map((match) => (
                    <TouchableOpacity key={match.id} onPress={() => handleMatchPress(match.id)}>
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
    poolContainer: {
        borderRadius: 18,
        padding: 8,
    },
    poolHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    poolLogo: {
        width: 25,
        height: 25,
        marginRight: 8,
        borderRadius: 12,
    },
    poolTitle: {
        fontSize: 14,
        fontWeight: "700",
    },
    matchList: {
        flexDirection: "column",
        gap: 12,
    },
});

export default PoolItem;