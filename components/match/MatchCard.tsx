import { colors } from "@/constants/Colors";
import { Match } from "@/types/Match";
import { Team } from "@/types/Team";

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

type MatchCardProps = {
    match: Match;
    teamA?: Team;
    teamB?: Team;
    mainColor: string;
    secondColor: string;
};

const MatchCard: React.FC<MatchCardProps> = ({
    match,
    teamA,
    teamB,
    mainColor,
    secondColor,
}) => {
    return (
        <View style={{ ...styles.card, backgroundColor: secondColor }}>
            {/* Équipe 1 */}
            <View
                style={{ ...styles.teamContainer, justifyContent: "flex-end" }}
            >
                <Text
                    style={styles.name}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {teamA?.short_name || "Équipe inconnue"}
                </Text>
                <Image
                    source={require("@/assets/clubs/paris_volley.png")}
                    style={styles.teamLogo}
                    contentFit="contain"
                />
            </View>

            {/* Score */}
            <View style={{ ...styles.scoreBox, borderColor: mainColor }}>
                <Text style={styles.scoreText}>{match.set || "-"}</Text>
            </View>

            {/* Équipe 2 */}
            <View
                style={{
                    ...styles.teamContainer,
                    justifyContent: "flex-start",
                }}
            >
                <Image
                    source={require("@/assets/clubs/as_cannes.png")}
                    style={styles.teamLogo}
                    contentFit="contain"
                />
                <Text
                    style={styles.name}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {teamB?.short_name || "Équipe inconnue"}
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
    name: {
        color: colors.light,
        fontSize: 14,
        fontWeight: "800",
        maxWidth: 80,
        minWidth: 80,
        textAlign: "center",
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

export default MatchCard;