import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { EnrichedMatchDTO, MatchStatus } from "@/src/types/Match";
import { withAlpha } from "@/src/utils/utils";
import { useAppTheme } from "@/src/context/ThemeProvider";
import MaskedImage from "../../common/MaskedImage";
import GradientBorderView from "../../common/GradientBorderView";
import { Division } from "@/src/types/Division";

type MatchRowProps = {
    enrichedMatch: EnrichedMatchDTO;
    division: Division;
};

const MatchRow: React.FC<MatchRowProps> = ({ enrichedMatch, division }) => {
    const theme = useAppTheme();

    const date = new Date(enrichedMatch.matchDate ?? "");
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    const matchTime = `${hh}:${mm}`;

    const upcoming = enrichedMatch.status === MatchStatus.UPCOMING;

    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;

    return (
        <View
            style={[
                styles.row,
                { borderColor: withAlpha(theme.text, 0.15), backgroundColor: theme.surface },
            ]}
        >
            <View style={[styles.team, styles.teamRight]}>
                <Text
                    style={[styles.teamName, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                >
                    {enrichedMatch.teamA.shortName || "Équipe A"}
                </Text>
                <MaskedImage uri={enrichedMatch.teamA.logoUrl} size={28} radius={8} />
            </View>

            <View style={styles.center}>
                {upcoming ? (
                    <View
                        style={[
                            styles.timePill,
                            {
                                backgroundColor: withAlpha(theme.text, 0.08),
                                borderColor: withAlpha(theme.text, 0.12),
                            },
                        ]}
                    >
                        <Text style={[styles.timeText, { color: theme.text }]}>{matchTime}</Text>
                    </View>
                ) : (
                    <GradientBorderView gradient={gradient} borderRadius={14} borderWidth={1}>
                        <View style={styles.scoreBox}>
                            <Text style={[styles.scoreText, { color: theme.text }]}>
                                {enrichedMatch.set || "-"}
                            </Text>
                        </View>
                    </GradientBorderView>
                )}
            </View>

            <View style={[styles.team, styles.teamLeft]}>
                <MaskedImage uri={enrichedMatch.teamB.logoUrl} size={28} radius={8} />
                <Text
                    style={[styles.teamName, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                >
                    {enrichedMatch.teamB.shortName || "Équipe B"}
                </Text>
            </View>
        </View>
    );
};

export default MatchRow;

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: "center",
    },
    team: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    teamRight: { justifyContent: "flex-end" },
    teamLeft: { justifyContent: "flex-start" },
    teamName: {
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center",
        flex: 1,
    },
    center: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
    },
    timePill: {
        paddingHorizontal: 6,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
    },
    timeText: { fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
    scoreBox: { paddingHorizontal: 8, paddingVertical: 6 },
    scoreText: { fontSize: 18, fontWeight: "700", letterSpacing: 0.2 },
});