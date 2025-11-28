// FILE: src/components/match/MatchRow.tsx

import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { EnrichedMatchDTO, MatchStatus } from "@/src/types/Match";
import { Division } from "@/src/types/Division";
import { withAlpha } from "@/src/utils/utils";
import { useAppTheme } from "@/src/context/ThemeProvider";
import MaskedImage from "../common/images/MaskedImage";
import GradientBorderView from "../common/GradientBorderView";
import InfoPill from "@/src/components/common/chips/InfoPill";

export type MatchRowProps = {
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
    const isFinished = enrichedMatch.status === MatchStatus.FINISHED;
    const hasLiveLink = !!enrichedMatch.liveUrl;

    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;

    const livePillLabel = hasLiveLink
        ? isFinished
            ? "Rediffusion disponible"
            : "Live"
        : null;

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: theme.surface,
                    borderColor: withAlpha(theme.text, 0.30),
                },
            ]}
            testID={`match-row-${enrichedMatch.id}`}
        >
            {/* Ligne dédiée en haut à droite pour la pastille Live / Rediff */}
            {livePillLabel && (
                <View style={styles.topRow}>
                    <InfoPill
                        label={livePillLabel}
                        leftIconName="video-outline"
                        showRedDot={!isFinished}
                        overlayColor={theme.backgroundSecondary}
                        style={styles.livePill}
                        labelStyle={styles.livePillText}
                    />
                </View>
            )}

            {/* Ligne principale (logos + heure/score) */}
            <View style={styles.mainRow}>
                {/* Équipe A */}
                <View style={[styles.team, styles.teamRight]}>
                    <Text
                        style={[styles.teamName, { color: theme.text }]}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                    >
                        {enrichedMatch.teamA.shortName}
                    </Text>

                    <MaskedImage
                        uri={enrichedMatch.teamA.logoUrl}
                        size={28}
                        radius={8}
                    />
                </View>

                {/* Centre : heure / score */}
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
                            <Text
                                style={[
                                    styles.timeText,
                                    { color: theme.text },
                                ]}
                            >
                                {matchTime}
                            </Text>
                        </View>
                    ) : (
                        <GradientBorderView
                            gradient={gradient}
                            borderRadius={14}
                            borderWidth={1}
                        >
                            <View style={styles.scoreBox}>
                                <Text
                                    style={[
                                        styles.scoreText,
                                        { color: theme.text },
                                    ]}
                                >
                                    {enrichedMatch.set || "-"}
                                </Text>
                            </View>
                        </GradientBorderView>
                    )}
                </View>

                {/* Équipe B */}
                <View style={[styles.team, styles.teamLeft]}>
                    <MaskedImage
                        uri={enrichedMatch.teamB.logoUrl}
                        size={28}
                        radius={8}
                    />

                    <Text
                        style={[styles.teamName, { color: theme.text }]}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                    >
                        {enrichedMatch.teamB.shortName}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default React.memo(MatchRow);

const styles = StyleSheet.create({
    card: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 8,
        paddingVertical: 10,
        gap: 6,
    },
    topRow: {
        marginTop: -4,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    mainRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    team: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    teamRight: {
        justifyContent: "flex-end",
    },
    teamLeft: {
        justifyContent: "flex-start",
    },
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
    timeText: {
        fontSize: 14,
        fontWeight: "700",
    },
    scoreBox: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    scoreText: {
        fontSize: 18,
        fontWeight: "700",
    },
    livePill: {
        paddingVertical: 3,
        paddingHorizontal: 6,
    },
    livePillText: {
        fontSize: 11,
        fontWeight: "700",
    },
});