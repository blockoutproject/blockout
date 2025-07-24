import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Image } from 'expo-image';
import { EnrichedMatchDTO, MatchStatus } from "@/src/types/Match";
import GradientBorderView from "../../common/GradientBorderView";
import { useThemeColor } from "@/src/hooks/useThemeColor";

type Props = {
    enrichedMatch: EnrichedMatchDTO
    gradient: readonly [string, string, ...string[]];
};

const MatchCard: React.FC<Props> = ({ enrichedMatch, gradient }) => {
    const card = useThemeColor({}, "card");
    const text = useThemeColor({}, "text");

    const date = new Date(enrichedMatch.matchDate ?? "");
    const matchTime = `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

    return (
        <View style={[styles.matchCard, { backgroundColor: card }]}>
            {/* Team A */}
            <View style={[styles.teamSide, styles.teamAlignRight]}>
                <Text
                    style={[styles.teamName, { color: text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {enrichedMatch.teamA.shortName || "Équipe inconnue"}
                </Text>
                <Image
                    source={
                        enrichedMatch.teamA.logoUrl
                            ? { uri: enrichedMatch.teamA.logoUrl }
                            : require('@/assets/clubs/default_club_logo.png')
                    }
                    style={[styles.teamLogo, { backgroundColor: text }]}
                    contentFit="contain"
                />
            </View>

            {/* Center */}
            <View style={styles.centerBlock}>
                {enrichedMatch.status === MatchStatus.UPCOMING ? (
                    <Text style={[styles.timeText, { color: text }]}>
                        {matchTime}
                    </Text>
                ) : (

                    <GradientBorderView
                        style={styles.finalScoreBox}
                        borderRadius={12}
                        gradient={gradient}
                    >
                        <Text style={[styles.finalScoreTextLarge, { color: text }]}>
                            {enrichedMatch.set || "-"}
                        </Text>
                    </GradientBorderView>
                )}
            </View>

            {/* Team B */}
            <View style={[styles.teamSide, styles.teamAlignLeft]}>
                <Image
                    source={
                        enrichedMatch.teamB.logoUrl
                            ? { uri: enrichedMatch.teamB.logoUrl }
                            : require('@/assets/clubs/default_club_logo.png')
                    }
                    style={[styles.teamLogo, { backgroundColor: text }]}
                    contentFit="contain"
                />
                <Text
                    style={[styles.teamName, { color: text }]}
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
        width: 33,
        aspectRatio: 1,
        borderRadius: 10,
    },
    teamName: {
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
        paddingHorizontal: 6,
        flex: 1,
    },
    finalScoreBox: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    finalScoreTextLarge: {
        fontSize: 20,
        fontWeight: "700",
    },
    centerBlock: {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 8,
    },
    timeText: {
        fontSize: 18,
        fontWeight: "700",
    },
});

export default MatchCard;