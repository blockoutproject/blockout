import { colors } from "@/constants/Colors";
import { Match, MatchStatus } from "@/types/Match";
import { Team } from "@/types/Team";

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import FastImage from 'react-native-fast-image'

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

            {/* Score */}
            {match.status === MatchStatus.UPCOMING ? (
                <View style={{ ...styles.timeBox, borderColor: mainColor }}>
                    <Text style={styles.timeText}>
                        {
                            // Si match_date est défini, on formate l'heure, sinon on affiche "-"
                            match?.match_date
                                ? (() => {
                                    const date = new Date(match.match_date);
                                    const hours = date.getHours().toString().padStart(2, '0');
                                    const minutes = date.getMinutes().toString().padStart(2, '0');
                                    return `${hours}:${minutes}`;
                                })()
                                : "-"
                        }
                    </Text>
                </View>
            ) : (
                <View style={{ ...styles.scoreBox, borderColor: mainColor }}>
                    <Text style={styles.scoreText}>{match.set || "-"}</Text>
                </View>
            )}

            {/* Équipe 2 */}
            <View
                style={{
                    ...styles.teamContainer,
                    justifyContent: "flex-start",
                }}
            >
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
                    minimumFontScale={0.8}
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
        gap: 4,
    },
    teamContainer: {
        alignItems: "center",
        flex: 3,
        flexDirection: "row",
    },
    name: {
        color: colors.light,
        fontSize: 16,
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
        paddingHorizontal: 8,
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
        color: colors.light,
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