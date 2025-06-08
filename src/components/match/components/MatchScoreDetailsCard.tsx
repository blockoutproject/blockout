import React from "react";
import { View, Text } from "react-native";
import FastImage from "react-native-fast-image";
import { Match } from "@/src/types/Match";
import { Team } from "@/src/types/Team";
import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientBorderView from "../../common/GradientBorderView";
import matchStyles from "../matchStyles";

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
        <View style={matchStyles.scoreDetailsTeamRow}>
            <View style={matchStyles.teamLogoColumn}>
                <FastImage source={logo} style={matchStyles.teamLogoSmall} resizeMode="contain" />
            </View>
            <View style={matchStyles.teamNameColumn}>
                <Text
                    style={[matchStyles.shortTeamName, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {team.shortName}
                </Text>
            </View>
            <View style={matchStyles.finalScoreColumn}>
                <View style={[matchStyles.scoreBox, { borderColor: theme.textInactive }]}>
                    <Text style={[matchStyles.finalScoreTextSmall, { color: theme.text }]}>{finalScore}</Text>
                </View>
            </View>
            {sets.map((setScore, idx) => {
                const isWinner = setScore > opponentSets[idx];
                return (
                    <View style={matchStyles.setColumn} key={`set-${idx}`}>
                        <Text
                            style={[
                                matchStyles.setScoreText,
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
            style={matchStyles.scoreDetailsCard}
            colorsOverride={[theme.background, theme.background]}
        >
            <Text style={[matchStyles.scoreDetailsTitle, { color: theme.text }]}>{title}</Text>
            <View style={matchStyles.scoreDetailsWrapper}>
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

export default MatchScoreDetailsCard;
