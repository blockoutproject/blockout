import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from 'expo-image';
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Team } from "@/src/types/Team";
import { splitIsoDateFormatted } from "@/src/utils/utils";
import * as Haptics from "expo-haptics";
import GradientBorderView from "../../common/GradientBorderView";
import { EnrichedMatchDTO } from "@/src/types/Match";
import { router } from "expo-router";

export interface MatchScoreCardProps {
    enrichedMatch: EnrichedMatchDTO
    gradient: readonly [string, string, ...string[]];
}

const MatchScoreCard: React.FC<MatchScoreCardProps> = ({
    enrichedMatch,
    gradient,
}) => {
    const theme = useAppTheme();
    const { date, time } = splitIsoDateFormatted(enrichedMatch.matchDate);

    const handleTeamPress = (teamId: number) => {
        Haptics.selectionAsync();
        router.push(`/team/${teamId}`);
    };

    const TeamBlock: React.FC<{
        team: Team & { logoUrl: string | null };
        role: "Home" | "Away";
    }> = ({ team, role }) => (
        <Pressable onPress={() => handleTeamPress(team.id)} style={styles.teamCard}>
            <Image
                source={
                    team.logoUrl
                        ? { uri: team.logoUrl }
                        : require('@/assets/clubs/default_club_logo.png')
                }
                style={[styles.teamLogoLarge, { backgroundColor: theme.text }]}
                contentFit="contain"
            />
            <Text
                style={[styles.teamLabel, { color: theme.text }]}
                numberOfLines={2}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.8}
            >
                {team.name}
            </Text>
            <Text style={[styles.teamRoleLabel, { color: theme.textInactive }]}>{role}</Text>
        </Pressable>
    );

    return (
        <>
            <View style={[styles.container, { backgroundColor: theme.background, borderColor: enrichedMatch.pool.division.mainColor }]}>
                <View style={styles.verticalContainer}>
                    <Text style={[styles.leagueLabel, { color: theme.text }]}>
                        {enrichedMatch.pool.division.name}
                    </Text>

                    <View style={styles.teamRowContainer}>
                        <TeamBlock
                            team={enrichedMatch.teamA}
                            role="Home"
                        />

                        <View style={styles.centerBlock}>
                            {enrichedMatch.set ? (
                                <>
                                    <GradientBorderView
                                        style={[styles.finalScoreBox, { backgroundColor: theme.background }]}
                                        borderRadius={12}
                                        gradient={gradient}
                                    >
                                        <Text
                                            style={[styles.finalScoreTextLarge, { color: theme.text }]}
                                        >
                                            {enrichedMatch.set}
                                        </Text>
                                    </GradientBorderView>
                                    {time && (
                                        <Text
                                            style={[styles.timeText, { color: theme.textInactive }]}
                                        >
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
                                    <Text
                                        style={[styles.upcomingLabel, { color: theme.textInactive }]}
                                    >
                                        À venir
                                    </Text>
                                </>
                            )}
                        </View>

                        <TeamBlock
                            team={enrichedMatch.teamB}
                            role="Away"
                        />
                    </View>

                    {date && (
                        <Text style={[styles.dateText, { color: theme.text }]}>{date}</Text>
                    )}
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    verticalContainer: {
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
    },
    teamRowContainer: {
        flexDirection: "row",
    },
    teamCard: {
        flex: 1,
        alignItems: "center"
    },
    teamLogoLarge: {
        width: 90,
        aspectRatio: 1,
        borderRadius: 22,
        marginBottom: 8
    },
    teamLabel: {
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center"
    },
    teamRoleLabel: {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 2
    },
    centerBlock: {
        alignItems: "center",
        justifyContent: "center",
        gap: 8
    },
    finalScoreBox: {
        paddingHorizontal: 10,
        paddingVertical: 6
    },
    finalScoreTextLarge: {
        fontSize: 28,
        fontWeight: "700"
    },
    timeText: {
        fontSize: 14,
        fontWeight: "600"
    },
    upcomingLabel: {
        fontSize: 14,
        fontWeight: "600"
    },
    dateText: {
        fontWeight: "700",
        fontSize: 14
    },
    leagueLabel: {
        fontWeight: "600",
        fontSize: 14
    },
    largeTimeText: {
        fontSize: 36,
        fontWeight: "700"
    },
});

export default MatchScoreCard;