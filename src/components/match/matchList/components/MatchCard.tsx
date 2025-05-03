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
                    numberOfLines={2}
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

            {/* Bloc central */}
            <View style={[styles.centerBlock]}>
            {match.status === MatchStatus.UPCOMING ? (
                <Text style={styles.timeText}>{matchTime}</Text>
            ) : (
                <View style={[styles.centerFlow, { borderColor: mainColor }]}>
                    <Text style={styles.scoreText}>{match.set || "-"}</Text>
                </View>
            )}
            </View>

            {/* Équipe B */}
            <View style={[styles.teamContainer, styles.teamRight]}>
                <FastImage
                    source={require("@/assets/clubs/as_cannes.png")}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />
                <Text
                    style={styles.name}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {teamB?.short_name || "Équipe inconnue"}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 10,
        flexDirection: "row",
        gap: 4,
    },
    centerBlock: {
        justifyContent: "center",
        alignItems: "center",
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
        fontSize: 16,
        fontWeight: "700",
        flex: 1,
        textAlign: "center",
    },
    teamLogo: {
        height: 35,
        width: 35,
    },
    centerFlow: {
        borderWidth: 2,
        borderRadius: 10,
        backgroundColor: colors.dark,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    scoreText: {
        color: colors.light,
        fontSize: 22,
        fontWeight: '700',
    },
    timeText: {
        color: colors.light,
        fontSize: 22,
        fontWeight: '600',
    },
});

export default MatchCard;