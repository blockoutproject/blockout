import React from "react";
import { Text, View, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { EnrichedMatchDTO, Match, MatchStatus } from "@/src/types/Match";
import { Team } from "@/src/types/Team";
import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientBorderView from "../../common/GradientBorderView";
import { GradientVariants } from "@/src/utils/utils";
import { Division } from "@/src/types/Division";

type Props = {
    enrichedMatch: EnrichedMatchDTO
    gradient: readonly [string, string, ...string[]];
};

const MatchCard: React.FC<Props> = ({ enrichedMatch, gradient }) => {
    const theme = useAppTheme();
    const date = new Date(enrichedMatch.matchDate ?? "");
    const matchTime = `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

    return (
        <View style={[styles.matchCard, { backgroundColor: theme.backgroundSecondary }]}>
            {/* Team A */}
            <View style={[styles.teamSide, styles.teamAlignRight]}>
                <Text
                    style={[styles.teamName, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {enrichedMatch.teamA.shortName || "Équipe inconnue"}
                </Text>
                <FastImage
                    source={require("@/assets/clubs/paris_volley.png")}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />
            </View>

            {/* Center */}
            <View style={styles.centerBlock}>
                {enrichedMatch.status === MatchStatus.UPCOMING ? (
                    <Text style={[styles.timeText, { color: theme.text }]}>
                        {matchTime}
                    </Text>
                ) : (

                    <GradientBorderView
                        style={styles.finalScoreBox}
                        borderRadius={12}
                        gradient={gradient}
                    >
                        <Text style={[styles.finalScoreTextLarge, { color: theme.text }]}>
                            {enrichedMatch.set || "-"}
                        </Text>
                    </GradientBorderView>
                )}
            </View>

            {/* Team B */}
            <View style={[styles.teamSide, styles.teamAlignLeft]}>
                <FastImage
                    source={require("@/assets/clubs/as_cannes.png")}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />
                <Text
                    style={[styles.teamName, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {enrichedMatch.teamB.shortName || "Équipe inconnue"}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    matchCard: {
        flexDirection: "row",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 8,
        gap: 2,
    },
    teamSide: {
        flex: 3,
        flexDirection: "row",
        alignItems: "center",
    },
    teamAlignRight: {
        justifyContent: "flex-end",
    },
    teamAlignLeft: {
        justifyContent: "flex-start",
    },
    teamLogo: {
        width: 35,
        height: 35,
    },
    teamName: {
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
        flex: 1,
    },
    finalScoreBox: {
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    finalScoreTextLarge: {
        fontSize: 20,
        fontWeight: "700",
    },
    centerBlock: {
        justifyContent: "center",
        alignItems: "center",
    },
    scoreBadge: {
        borderWidth: 2,
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    timeText: {
        fontSize: 16,
        fontWeight: "600",
    },
});

export default MatchCard;