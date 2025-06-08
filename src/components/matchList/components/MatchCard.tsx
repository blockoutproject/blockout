import React from "react";
import { Text, View } from "react-native";
import FastImage from "react-native-fast-image";
import { Match, MatchStatus } from "@/src/types/Match";
import { Team } from "@/src/types/Team";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { matchListStyles } from "../matchListStyles";

type Props = {
    match: Match;
    teamA?: Team;
    teamB?: Team;
    mainColor: string;
    secondColor: string;
};

const MatchCard: React.FC<Props> = ({ match, teamA, teamB }) => {
    const theme = useAppTheme();
    const date = new Date(match.matchDate ?? "");
    const matchTime = `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

    return (
        <View style={[matchListStyles.matchCard, { backgroundColor: theme.background }]}>
            {/* Team A */}
            <View style={[matchListStyles.teamSide, matchListStyles.teamAlignRight]}>
                <Text 
                    style={[matchListStyles.teamName, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {teamA?.shortName || "Équipe inconnue"}
                </Text>
                <FastImage
                    source={require("@/assets/clubs/paris_volley.png")}
                    style={matchListStyles.teamLogo}
                    resizeMode="contain"
                />
            </View>

            {/* Center */}
            <View style={matchListStyles.centerBlock}>
                {match.status === MatchStatus.UPCOMING ? (
                    <Text style={[matchListStyles.timeText, { color: theme.text }]}>
                        {matchTime}
                    </Text>
                ) : (
                    <View
                        style={[
                            matchListStyles.scoreBadge,
                            { borderColor: theme.borderSecondary },
                        ]}
                    >
                        <Text style={[matchListStyles.scoreText, { color: theme.text }]}>
                            {match.set || "-"}
                        </Text>
                    </View>
                )}
            </View>

            {/* Team B */}
            <View style={[matchListStyles.teamSide, matchListStyles.teamAlignLeft]}>
                <FastImage
                    source={require("@/assets/clubs/as_cannes.png")}
                    style={matchListStyles.teamLogo}
                    resizeMode="contain"
                />
                <Text 
                    style={[matchListStyles.teamName, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {teamB?.shortName || "Équipe inconnue"}
                </Text>
            </View>
        </View>
    );
};

export default MatchCard;