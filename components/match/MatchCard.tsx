import { colors } from "@/constants/colors";
import { Match } from "@/types/Match";
import { Team } from "@/types/Team";

import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

type MatchCardProps = {
    match: Match;
    teamA?: Team;
    teamB?: Team;
};

export default function MatchCard({ match, teamA, teamB }: MatchCardProps) {
    const index = Math.floor(Math.random() * 3);

    const mainLeagueColors = ["#5a8d36", "#007d89", "#bf447d"];
    const mainLeagueColor = mainLeagueColors[index];

    const secondLeagueColors = ["#2f362b", "#243335", "#3d3136"];
    const secondLeagueColor = secondLeagueColors[index];

    return (
        <View style={{ ...styles.card, backgroundColor: secondLeagueColor }}>
            {/* Équipe 1 */}
            <View style={{ ...styles.teamContainer, justifyContent: "flex-end" }}>
                <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
                    {teamA?.team_name || "Équipe inconnue"}
                </Text>
                <Image
                    source={require("@/assets/clubs/paris_volley.png")}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />
            </View>

            {/* Score */}
            <View style={{ ...styles.scoreBox, borderColor: mainLeagueColor }}>
                <Text style={styles.scoreText}>{match.set || "-"}</Text>
            </View>

            {/* Équipe 2 */}
            <View style={{ ...styles.teamContainer, justifyContent: "flex-start" }}>
                <Image
                    source={require("@/assets/clubs/as_cannes.png")}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />
                <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
                    {teamB?.team_name || "Équipe inconnue"}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 12,
        borderRadius: 10,
        flexDirection: "row",
        gap: 5,
    },
    teamContainer: {
        alignItems: "center",
        flex: 3,
        flexDirection: "row",
    },
    teamName: {
        color: colors.light,
        fontSize: 14,
        fontWeight: "800",
        maxWidth: 80,
        minWidth: 80,
    },
    teamLogo: {
        height: 35,
        width: 35,
    },
    scoreBox: {
        alignItems: "center",
        backgroundColor: colors.dark,
        borderWidth: 2,
        borderRadius: 8,
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 8,
    },
    scoreText: {
        color: colors.light,
        fontSize: 22,
        fontWeight: "800",
    },
});