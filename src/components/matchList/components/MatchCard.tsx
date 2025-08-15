import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";

import { EnrichedMatchDTO, MatchStatus } from "@/src/types/Match";
import GradientBorderView from "../../common/GradientBorderView";
import { useThemeColor } from "@/src/hooks/useThemeColor";
import { withAlpha } from "@/src/utils/utils";
import { CORNERS } from "@/src/theme/globals";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { th } from "date-fns/locale";
import MaskedImage from "../../common/MaskedImage";

type Props = {
    enrichedMatch: EnrichedMatchDTO;
    gradient: readonly [string, string, ...string[]];
};

const MatchCard: React.FC<Props> = ({ enrichedMatch, gradient }) => {
    const theme = useAppTheme();

    const date = new Date(enrichedMatch.matchDate ?? "");
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    const matchTime = `${hh}:${mm}`;

    return (
        <View
            style={[
                styles.matchCard,
                {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                },
            ]}
        >
            {/* Team A */}
            <View style={[styles.teamSide, styles.teamAlignRight]}>
                <Text
                    style={[styles.teamName, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                >
                    {enrichedMatch.teamA.shortName || "Équipe inconnue"}
                </Text>
                <MaskedImage
                    uri={enrichedMatch.teamA.logoUrl}
                    size={32}
                    radius={10}
                    shadow={false}
                />
            </View>

            {/* Center */}
            <View style={styles.centerBlock}>
                {enrichedMatch.status === MatchStatus.UPCOMING ? (
                    <View
                        style={[
                            styles.pill,
                            {
                                backgroundColor: withAlpha(theme.text, 0.08),
                                borderColor: withAlpha(theme.text, 0.12),
                            },
                        ]}
                    >
                        <Text style={[styles.timeText, { color: theme.text }]}>{matchTime}</Text>
                    </View>
                ) : (
                    <GradientBorderView style={styles.finalScoreBox} borderRadius={12} gradient={gradient}>
                        <Text style={[styles.finalScoreTextLarge, { color: theme.text }]}>
                            {enrichedMatch.set || "-"}
                        </Text>
                    </GradientBorderView>
                )}
            </View>

            {/* Team B */}
            <View style={[styles.teamSide, styles.teamAlignLeft]}>
                <MaskedImage
                    uri={enrichedMatch.teamB.logoUrl}
                    size={32}
                    radius={10}
                    shadow={false}
                />
                <Text
                    style={[styles.teamName, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                >
                    {enrichedMatch.teamB.shortName || "Équipe inconnue"}
                </Text>
            </View>
        </View>
    );
};

export default MatchCard;

const LOGO_SIZE = 32;

const styles = StyleSheet.create({
    matchCard: {
        flexDirection: "row",
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 6,
    },
    teamSide: {
        flex: 3,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    teamAlignRight: {
        justifyContent: "flex-end",
    },
    teamAlignLeft: {
        justifyContent: "flex-start",
    },
    teamName: {
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center",
        paddingHorizontal: 4,
        flex: 1,
    },
    centerBlock: {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 6,
    },
    pill: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: CORNERS,
        borderWidth: StyleSheet.hairlineWidth,
    },
    finalScoreBox: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    finalScoreTextLarge: {
        fontSize: 20,
        fontWeight: "700",
    },
    timeText: {
        fontSize: 14,
        fontWeight: "700",
    },
});