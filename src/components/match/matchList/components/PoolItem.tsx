import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import MatchCard from "./MatchCard";
import { colors } from "@/src/constants/Colors";

interface PoolItemProps {
    pool: EnrichedPoolMatchesDTO;
    index: number;
    handlePoolPress: (poolId: number) => void;
    handleCardPress: (matchId: number) => void;
    mainLeagueColors: string[];
    secondLeagueColors: string[];
}

const PoolItem = ({
    pool,
    index,
    handlePoolPress,
    handleCardPress,
    mainLeagueColors,
    secondLeagueColors,
}: PoolItemProps) => {
    const colorIndex = index % mainLeagueColors.length;

    const teamMatches = pool.matches.map((match) => (
        <TouchableOpacity
            key={match.id}
            onPress={() => handleCardPress(match.id)}
        >
            <MatchCard
                match={match}
                teamA={match.teamA}
                teamB={match.teamB}
                mainColor={mainLeagueColors[colorIndex]}
                secondColor={secondLeagueColors[colorIndex]}
            />
        </TouchableOpacity>
    ));

    return (
        <View style={styles.poolContainer}>
            <TouchableOpacity onPress={() => handlePoolPress(pool.pool_id)}>
                <View style={styles.poolHeader}>
                    <FastImage
                        source={require("@/assets/leagues/msl.png")}
                        style={styles.poolLogo}
                        resizeMode="contain"
                    />
                    <Text 
                        style={styles.poolTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        adjustsFontSizeToFit
                        minimumFontScale={0.9}
                    >
                        {pool.poolData?.pool_name ?? "Chargement..."}
                    </Text>
                </View>
            </TouchableOpacity>
            <View style={{ gap: 12 }}>
                {teamMatches}
            </View>
        </View>
    );
};

export default memo(PoolItem);

const styles = StyleSheet.create({
    poolContainer: {
        borderRadius: 16,
        padding: 12,
        backgroundColor: colors.grey,
    },
    poolHeader: {
        marginBottom: 12,
        paddingHorizontal: 12,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    poolLogo: {
        width: 20,
        height: 20,
        marginRight: 8,
        borderRadius: 5,
    },
    poolTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.active,
    },
});