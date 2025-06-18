import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Team } from "@/src/types/Team";
import { GradientVariants, splitIsoDateFormatted } from "@/src/utils/utils";
import { useGlobalBottomSheet } from "@/src/context/GlobalBottomSheetProvider";
import * as Haptics from "expo-haptics";
import TeamContainer from "../../team/Team";
import GradientBorderView from "../../common/GradientBorderView";

export interface MatchScoreCardProps {
    leagueName: string;
    homeTeam: Team;
    awayTeam: Team;
    finalScore?: string;
    matchDate: string;
    gradient: GradientVariants;
}

const MatchScoreCard: React.FC<MatchScoreCardProps> = ({
    leagueName,
    homeTeam,
    awayTeam,
    finalScore,
    matchDate,
    gradient,
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
        <Pressable onPress={() => handleTeamPress(team.id)} style={styles.teamCard}>
            <FastImage source={logo} style={styles.teamLogoLarge} resizeMode="contain" />
            <Text style={[styles.teamLabel, { color: theme.text }]} numberOfLines={2}>
                {team.name}
            </Text>
            <Text style={[styles.teamRoleLabel, { color: theme.textInactive }]}>{role}</Text>
        </Pressable>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]} >
            <View style={styles.verticalContainer}>
                <Text style={[styles.leagueLabel, { color: theme.text }]}>{leagueName}</Text>

                <View style={styles.teamRowContainer}>
                    <TeamBlock team={homeTeam} logo={home} role="Home" />

                    <View style={styles.centerBlock}>
                        {finalScore ? (
                            <>
                                <GradientBorderView
                                    style={styles.finalScoreBox}
                                    borderRadius={12}
                                    gradient={gradient}
                                >
                                    <Text style={[styles.finalScoreTextLarge, { color: theme.text }]}>
                                        {finalScore}
                                    </Text>
                                </GradientBorderView>
                                {time && (
                                    <Text style={[styles.timeText, { color: theme.textInactive }]}>
                                        {time}
                                    </Text>
                                )}
                            </>
                        ) : (
                            <>
                                {time && (
                                    <Text style={[styles.largeTimeText, { color: theme.text }]}>
                                        {time}
                                    </Text>
                                )}
                                <Text style={[styles.upcomingLabel, { color: theme.textInactive }]}>À venir</Text>
                            </>
                        )}
                    </View>

                    <TeamBlock team={awayTeam} logo={away} role="Away" />
                </View>

                {date && <Text style={[styles.dateText, { color: theme.text }]}>{date}</Text>}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    verticalContainer: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4,
    },
    teamRowContainer: {
        flexDirection: "row",
    },
    teamCard: {
        flex: 1,
        marginHorizontal: 12,
        alignItems: "center",
    },
    teamLogoLarge: {
        width: 90,
        height: 90,
        marginBottom: 4,
    },
    teamLabel: {
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
    teamRoleLabel: {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 2,
    },
    centerBlock: {
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    finalScoreBox: {
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    finalScoreTextLarge: {
        fontSize: 28,
        fontWeight: "700",
    },
    timeText: {
        fontSize: 14,
        fontWeight: "600",
    },
    upcomingLabel: {
        fontSize: 14,
        fontWeight: "600",
    },
    dateText: {
        fontWeight: "700",
        fontSize: 14,
    },
    leagueLabel: {
        fontWeight: "600",
        fontSize: 14,
    },
    largeTimeText: {
        fontSize: 36,
        fontWeight: "700",
    },
});

export default MatchScoreCard;
