import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { PoolMatchesDTO, Match } from "@/types/Match";
import { Team } from "@/types/Team";
import { Pool } from "@/types/Pool";
import MatchCard from "./MatchCard";
import { colors } from "@/constants/Colors";

type Props = {
    pool: PoolMatchesDTO;
    teams: Record<number, Team>;
    pools: Record<number, Pool>;
    index: number;
    handlePoolPress: (poolId: number) => void;
    handleCardPress: (matchId: number) => void;
    mainLeagueColors: string[];
    secondLeagueColors: string[];
};

const PoolItem = ({
    pool,
    teams,
    pools,
    index,
    handlePoolPress,
    handleCardPress,
    mainLeagueColors,
    secondLeagueColors,
}: Props) => {
    const colorIndex = index % mainLeagueColors.length;

    const teamMatches = pool.matches.map((match: Match) => {
        const teamA = teams[match.team_id_a];
        const teamB = teams[match.team_id_b];
        return (
            <TouchableOpacity
                key={match.id}
                onPress={() => handleCardPress(match.id)}
            >
                <MatchCard
                    match={match}
                    teamA={teamA}
                    teamB={teamB}
                    mainColor={mainLeagueColors[colorIndex]}
                    secondColor={secondLeagueColors[colorIndex]}
                />
            </TouchableOpacity>
        );
    });

    return (
        <View style={styles.poolContainer}>
            <TouchableOpacity onPress={() => handlePoolPress(pool.pool_id)}>
                <View style={styles.poolHeader}>
                    <FastImage
                        source={require("../../../../assets/leagues/msl.png")}
                        style={styles.poolLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.poolTitle}>
                        {pools[pool.pool_id]
                            ? pools[pool.pool_id].pool_name
                            : "Chargement..."}
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