import React from "react";
import { View, Text, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { EnrichedMatchDTO, Match } from "@/src/types/Match";
import { Team } from "@/src/types/Team";
import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientBorderView from "../../common/GradientBorderView";
import GradientView from "../../common/GradientView";
import { GradientVariants } from "@/src/utils/utils";

type MatchScoreDetailsCardProps = {
    title: string;
    enrichedMatch: EnrichedMatchDTO;
};

const MatchScoreDetailsCard: React.FC<MatchScoreDetailsCardProps> = ({
    title = "Score",
    enrichedMatch
}) => {
    const theme = useAppTheme();
    const setsArray = enrichedMatch.score?.split(",").map((s) => s.split("-")) || [];
    const [homeFinal, awayFinal] = enrichedMatch.set?.split("-") || ["0", "0"];

    const homeSets = setsArray.map((set) => parseInt(set[0], 10));
    const awaySets = setsArray.map((set) => parseInt(set[1], 10));

    const TeamRow: React.FC<{
        team: Team;
        finalScore: string;
        sets: number[];
        opponentSets: number[];
        logo: any;
    }> = ({ team, finalScore, sets, opponentSets, logo }) => (
        <View style={styles.scoreDetailsTeamRow}>
            <View style={styles.teamLogoColumn}>
                <FastImage source={logo} style={styles.teamLogoSmall} resizeMode="contain" />
            </View>
            <View style={styles.teamNameColumn}>
                <Text
                    style={[styles.shortTeamName, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {team.shortName}
                </Text>
            </View>
            <View style={styles.finalScoreColumn}>
                <View style={[styles.scoreBox, { borderColor: theme.textInactive }]}>
                    <Text style={[styles.finalScoreTextSmall, { color: theme.text }]}>{finalScore}</Text>
                </View>
            </View>
            {sets.map((setScore, index) => {
                const isWinner = setScore > opponentSets[index];
                return (
                    <View style={styles.setColumn} key={`set-${index}`}>
                        <Text
                            style={[
                                styles.setScoreText,
                                { color: isWinner ? theme.text : theme.textInactive },
                            ]}
                        >
                            {setScore}
                        </Text>
                    </View>
                );
            })}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]} >
            <Text style={[styles.scoreDetailsTitle, { color: theme.text }]}>{title}</Text>
            <View style={styles.scoreDetailsWrapper}>
                <TeamRow
                    team={enrichedMatch.teamA}
                    finalScore={homeFinal}
                    sets={homeSets}
                    opponentSets={awaySets}
                    logo={require("@/assets/clubs/paris_volley.png")}
                />
                <TeamRow
                    team={enrichedMatch.teamB}
                    finalScore={awayFinal}
                    sets={awaySets}
                    opponentSets={homeSets}
                    logo={require("@/assets/clubs/as_cannes.png")}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 18,
        padding: 16,
    },
    scoreDetailsTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
    },
    scoreDetailsWrapper: {
        flexDirection: "column",
        gap: 10,
    },
    scoreDetailsTeamRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    teamLogoColumn: {
        width: 40,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 4,
    },
    teamNameColumn: {
        flex: 1,
        marginRight: 4,
    },
    finalScoreColumn: {
        width: 40,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 4,
    },
    setColumn: {
        width: 30,
        justifyContent: "center",
        alignItems: "center",
    },
    teamLogoSmall: {
        width: 36,
        height: 36,
    },
    shortTeamName: {
        fontWeight: "600",
        fontSize: 14,
    },
    scoreBox: {
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    setScoreText: {
        fontSize: 16,
        fontWeight: "600",
    },
    finalScoreTextSmall: {
        fontSize: 16,
        fontWeight: "700",
    },
});

export default MatchScoreDetailsCard;
