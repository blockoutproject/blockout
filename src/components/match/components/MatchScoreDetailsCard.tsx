import React from "react";
import { View, Text, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { Match } from "@/src/types/Match";
import { Team } from "@/src/types/Team";
import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientBorderView from "../../common/GradientBorderView";

type MatchScoreDetailsCardProps = {
    title?: string;
    homeTeam: Team;
    awayTeam: Team;
    match: Match;
};

const MatchScoreDetailsCard: React.FC<MatchScoreDetailsCardProps> = ({
    title = "Score",
    homeTeam,
    awayTeam,
    match,
}) => {
    const theme = useAppTheme();
    const setsArray = match.score?.split(",").map((s) => s.split("-")) || [];
    const [homeFinal, awayFinal] = match.set?.split("-") || ["0", "0"];

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
            {sets.map((setScore, idx) => {
                const isWinner = setScore > opponentSets[idx];
                return (
                    <View style={styles.setColumn} key={`set-${idx}`}>
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
        <GradientBorderView
            style={styles.scoreDetailsCard}
            colorsOverride={[theme.background, theme.background]}
        >
            <Text style={[styles.scoreDetailsTitle, { color: theme.text }]}>{title}</Text>
            <View style={styles.scoreDetailsWrapper}>
                <TeamRow
                    team={homeTeam}
                    finalScore={homeFinal}
                    sets={homeSets}
                    opponentSets={awaySets}
                    logo={require("@/assets/clubs/paris_volley.png")}
                />
                <TeamRow
                    team={awayTeam}
                    finalScore={awayFinal}
                    sets={awaySets}
                    opponentSets={homeSets}
                    logo={require("@/assets/clubs/as_cannes.png")}
                />
            </View>
        </GradientBorderView>
    );
};

const styles = StyleSheet.create({
    scoreDetailsCard: {
        paddingHorizontal: 4,
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
    },
    finalScoreTextSmall: {
        fontSize: 16,
        fontWeight: "700",
    },
});

export default MatchScoreDetailsCard;
