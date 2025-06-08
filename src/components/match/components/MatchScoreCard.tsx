import React from "react";
import { View, Text, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Team } from "@/src/types/Team";
import { splitIsoDateFormatted } from "@/src/utils/utils";
import { useGlobalBottomSheet } from "@/src/context/GlobalBottomSheetProvider";
import * as Haptics from "expo-haptics";
import TeamContainer from "../../team/Team";
import GradientBorderView from "../../common/GradientBorderView";
import matchStyles from "../matchStyles";

export interface MatchScoreCardProps {
    leagueName: string;
    homeTeam: Team;
    awayTeam: Team;
    finalScore?: string;
    matchDate: string;
}

const MatchScoreCard: React.FC<MatchScoreCardProps> = ({
    leagueName,
    homeTeam,
    awayTeam,
    finalScore,
    matchDate,
}) => {
    const theme = useAppTheme();
    const { openSheet } = useGlobalBottomSheet();

    const home = require("@/assets/clubs/paris_volley.png");
    const away = require("@/assets/clubs/as_cannes.png");

    const { date, time } = splitIsoDateFormatted(matchDate);

    const handleTeamPress = (teamId: number) => {
        Haptics.selectionAsync();
        openSheet(<TeamContainer teamId={teamId} />);
    };

    const TeamBlock: React.FC<{ team: Team; logo: any; role: "Home" | "Away" }> = ({
        team,
        logo,
        role,
    }) => (
        <Pressable onPress={() => handleTeamPress(team.id)} style={matchStyles.teamCard}>
            <FastImage source={logo} style={matchStyles.teamLogoLarge} resizeMode="contain" />
            <Text style={[matchStyles.teamLabel, { color: theme.text }]} numberOfLines={2}>
                {team.name}
            </Text>
            <Text style={[matchStyles.teamRoleLabel, { color: theme.textInactive }]}>{role}</Text>
        </Pressable>
    );

    return (
        <GradientBorderView style={matchStyles.scoreCard}>
            <View style={matchStyles.verticalContainer}>
                <Text style={[matchStyles.leagueLabel, { color: theme.text }]}>{leagueName}</Text>

                <View style={matchStyles.teamRowContainer}>
                    <TeamBlock team={homeTeam} logo={home} role="Home" />

                    <View style={matchStyles.centerBlock}>
                        {finalScore ? (
                            <>
                                <GradientBorderView
                                    style={matchStyles.finalScoreBox}
                                    colorsOverride={[theme.borderSecondary, theme.borderSecondary]}
                                >
                                    <Text style={[matchStyles.finalScoreTextLarge, { color: theme.text }]}>
                                        {finalScore}
                                    </Text>
                                </GradientBorderView>
                                {time && (
                                    <Text style={[matchStyles.timeText, { color: theme.textInactive }]}>
                                        {time}
                                    </Text>
                                )}
                            </>
                        ) : (
                            <>
                                {time && (
                                    <Text style={[matchStyles.largeTimeText, { color: theme.text }]}>
                                        {time}
                                    </Text>
                                )}
                                <Text style={[matchStyles.upcomingLabel, { color: theme.textInactive }]}>À venir</Text>
                            </>
                        )}
                    </View>

                    <TeamBlock team={awayTeam} logo={away} role="Away" />
                </View>

                {date && <Text style={[matchStyles.dateText, { color: theme.text }]}>{date}</Text>}
            </View>
        </GradientBorderView>
    );
};

export default MatchScoreCard;
