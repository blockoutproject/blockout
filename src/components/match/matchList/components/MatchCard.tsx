import { colors } from "@/src/constants/Colors";
import { Match, MatchStatus } from "@/src/types/Match";
import { Team } from "@/src/types/Team";

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import FastImage from 'react-native-fast-image';

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
    const matchTime = match?.match_date
        ? (() => {
            const date = new Date(match.match_date);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        })()
        : "-";

    return (
        <View style={[styles.card, { backgroundColor: secondColor }]}>
            {/* Équipe A */}
            <View style={[styles.teamContainer, styles.teamLeft]}>
                <Text
                    style={styles.name}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {teamA?.short_name || "Équipe inconnue"}
                </Text>
                <FastImage
                    source={require("@/assets/clubs/paris_volley.png")}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />
            </View>

            {/* Score ou Heure */}
            {match.status === MatchStatus.UPCOMING ? (
                <View style={[styles.timeBox, { borderColor: mainColor }]}>
                    <Text style={styles.timeText}>{matchTime}</Text>
                </View>
            ) : (
                <View style={[styles.scoreBox, { borderColor: mainColor }]}>
                    <Text style={styles.scoreText}>{match.set || "-"}</Text>
                </View>
            )}

            {/* Équipe B */}
            <View style={[styles.teamContainer, styles.teamRight]}>
                <FastImage
                    source={require("@/assets/clubs/as_cannes.png")}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />
                <Text
                    style={styles.name}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                >
                    {teamB?.short_name || "Équipe inconnue"}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: 8,
        borderRadius: 10,
        flexDirection: "row",
        gap: 4,
    },
    teamContainer: {
        alignItems: "center",
        flex: 3,
        flexDirection: "row",
    },
    teamLeft: {
        justifyContent: "flex-end",
    },
    teamRight: {
        justifyContent: "flex-start",
    },
    name: {
        color: colors.active,
        fontSize: 14,
        fontWeight: "700",
        flex: 1,
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
        padding: 2,
    },
    timeBox: {
        alignItems: "center",
        backgroundColor: colors.dark,
        borderWidth: 2,
        borderRadius: 8,
        flex: 1.5,
        justifyContent: "center",
    },
    scoreText: {
        color: colors.active,
        fontSize: 22,
        fontWeight: "700",
    },
    timeText: {
        color: colors.light,
        fontSize: 18,
        fontWeight: "700",
    },
});

export default MatchCard;