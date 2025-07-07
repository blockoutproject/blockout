import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Team } from "@/src/types/Team";
import { GradientVariants, splitIsoDateFormatted } from "@/src/utils/utils";
import * as Haptics from "expo-haptics";
import TeamContainer from "../../team/TeamScreen";
import GradientBorderView from "../../common/GradientBorderView";

import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import BottomSheetCustomPage from "../../common/BottomSheetCustomPage";
import { EnrichedMatchDTO } from "@/src/types/Match";

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

    const teamSheetRef = useRef<BottomSheetModal>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

    const openTeamSheet = (id: number) => {
        Haptics.selectionAsync();
        setSelectedTeamId(id);
        teamSheetRef.current?.present();
    };

    const TeamBlock: React.FC<{
        team: Team;
        logo: any;
        role: "Home" | "Away";
    }> = ({ team, logo, role }) => (
        <Pressable onPress={() => openTeamSheet(team.id)} style={styles.teamCard}>
            <FastImage source={logo} style={styles.teamLogoLarge} resizeMode="contain" />
            <Text style={[styles.teamLabel, { color: theme.text }]} numberOfLines={2}>
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
                            logo={require("@/assets/clubs/paris_volley.png")}
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
                            logo={require("@/assets/clubs/as_cannes.png")}
                            role="Away"
                        />
                    </View>

                    {date && (
                        <Text style={[styles.dateText, { color: theme.text }]}>{date}</Text>
                    )}
                </View>
            </View>

            <BottomSheetCustomPage ref={teamSheetRef}>
                <BottomSheetView style={{ flex: 1 }}>
                    {selectedTeamId && <TeamContainer teamId={selectedTeamId} />}
                </BottomSheetView>
            </BottomSheetCustomPage>
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
        gap: 4,
    },
    teamRowContainer: {
        flexDirection: "row"
    },
    teamCard: {
        flex: 1,
        marginHorizontal: 12,
        alignItems: "center"
    },
    teamLogoLarge: {
        width: 90,
        aspectRatio: 1,
        marginBottom: 4
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