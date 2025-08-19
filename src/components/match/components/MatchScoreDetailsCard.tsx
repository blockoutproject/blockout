import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";

import { EnrichedMatchDTO } from "@/src/types/Match";
import { Team } from "@/src/types/Team";
import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientBorderView from "@/src/components/common/GradientBorderView";

type MatchScoreDetailsCardProps = {
    title?: string;
    enrichedMatch: EnrichedMatchDTO;
};

const RADIUS = 18;
const LOGO = 30;
const SET_COL_W = 32;
const PTS_BADGE_RADIUS = 10;

const MatchScoreDetailsCard: React.FC<MatchScoreDetailsCardProps> = ({
    title = "Score",
    enrichedMatch,
}) => {
    const theme = useAppTheme();
    const gradient = [
        enrichedMatch.pool.division.firstGradientColor,
        enrichedMatch.pool.division.secondGradientColor,
        enrichedMatch.pool.division.thirdGradientColor,
    ] as const;

    const setsArray = enrichedMatch.score
        ? enrichedMatch.score.split(",").map((s) => s.split("-").map((n) => parseInt(n, 10)))
        : [];
    const [homeFinal = "0", awayFinal = "0"] = (enrichedMatch.set || "0-0").split("-");
    const maxSets = Math.max(setsArray.length, 0);

    const homeSets = setsArray.map(([h]) => h);
    const awaySets = setsArray.map(([, a]) => a);

    const SetHeader: React.FC = () => (
        <View style={styles.row}>
            <View style={styles.identityPlaceholder} />
            <View style={styles.finalScoreColumn} />
            {Array.from({ length: maxSets }).map((_, i) => (
                <View key={`h-${i}`} style={styles.setColumn}>
                    <Text style={[styles.setHeaderText, { color: theme.textInactive }]}>{`S${i + 1}`}</Text>
                </View>
            ))}
        </View>
    );

    const TeamRow: React.FC<{
        team: Team & { logoUrl: string | null };
        finalScore: string;
        sets: number[];
        opponentSets: number[];
    }> = ({ team, finalScore, sets, opponentSets }) => (
        <View style={styles.row}>
            <View style={styles.identityBlock}>
                <Image
                    source={team.logoUrl ? { uri: team.logoUrl } : require("@/assets/clubs/default_club_logo.png")}
                    style={[styles.teamLogo, { backgroundColor: theme.text }]}
                    contentFit="contain"
                />
                <Text
                    style={[styles.teamName, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                >
                    {team.shortName || team.name}
                </Text>
            </View>

            <View style={styles.finalScoreColumn}>
                <GradientBorderView
                    gradient={gradient}
                    borderRadius={10}
                    borderWidth={1}
                    style={[styles.finalScoreBox, { backgroundColor: theme.background }]}
                >
                    <Text style={[styles.finalScoreText, { color: theme.text }]}>{finalScore}</Text>
                </GradientBorderView>
            </View>

            {Array.from({ length: maxSets }).map((_, i) => {
                const val = sets[i];
                const opp = opponentSets[i];
                const played = Number.isFinite(val) && Number.isFinite(opp);
                const isWinner = played ? val > opp : false;
                return (
                    <View key={`s-${i}`} style={styles.setColumn}>
                        <Text
                            style={[
                                styles.setScoreText,
                                isWinner
                                    ? { color: theme.text, fontWeight: "800" }
                                    : { color: theme.textInactive, fontWeight: "600" },
                            ]}
                        >
                            {played ? val : "—"}
                        </Text>
                    </View>
                );
            })}
        </View>
    );

    return (
        <GradientBorderView
            gradient={gradient}
            borderRadius={RADIUS}
            borderWidth={1}
            style={[styles.card, { backgroundColor: theme.background }]}
        >
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

            {maxSets > 0 ? <SetHeader /> : null}

            <View style={styles.rows}>
                <TeamRow
                    team={enrichedMatch.teamA}
                    finalScore={homeFinal}
                    sets={homeSets}
                    opponentSets={awaySets}
                />
                <TeamRow
                    team={enrichedMatch.teamB}
                    finalScore={awayFinal}
                    sets={awaySets}
                    opponentSets={homeSets}
                />
            </View>
        </GradientBorderView>
    );
};

export default MatchScoreDetailsCard;

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS,
        padding: 14,
        gap: 10,
    },
    title: {
        fontSize: 14,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    rows: { gap: 8 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    identityPlaceholder: { flex: 1 },
    identityBlock: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
    },
    teamLogo: {
        width: LOGO,
        aspectRatio: 1,
        borderRadius: 10,
    },
    teamName: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
    },
    finalScoreColumn: {
        width: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    finalScoreBox: {
        width: 34,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 6,
        borderRadius: PTS_BADGE_RADIUS,
    },
    finalScoreText: {
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 0.3,
    },
    setColumn: {
        width: SET_COL_W,
        alignItems: "center",
        justifyContent: "center",
    },
    setHeaderText: {
        fontSize: 12,
        fontWeight: "700",
    },
    setScoreText: { fontSize: 16 },
});