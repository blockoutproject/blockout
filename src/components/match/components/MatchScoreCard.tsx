import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { splitIsoDateFormatted } from "@/src/utils/utils";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import type { EnrichedMatchDTO } from "@/src/types/Match";
import type { Team } from "@/src/types/Team";
import InfoPill from "../../common/chips/InfoPill";
import InfoPillGradient from "../../common/chips/InfoPillGradient";
import MaskedImage from "../../common/images/MaskedImage";
import { useRouter } from "expo-router";

export interface MatchScoreCardProps {
    enrichedMatch: EnrichedMatchDTO;
    gradient: readonly [string, string, ...string[]];
}

const LOGO_SIZE = 84;
const RADIUS = 20;

const MatchScoreCard: React.FC<MatchScoreCardProps> = ({ enrichedMatch, gradient }) => {
    const theme = useAppTheme();
    const router = useRouter();
    const { date, time } = splitIsoDateFormatted(enrichedMatch.matchDate);

    const handleTeamPress = (teamId: number) => {
        Haptics.selectionAsync();
        router.push(`/teams/${teamId}`);
    };

    const TeamBlock: React.FC<{
        team: Team & { logoUrl: string | null };
        role: "Home" | "Away";
    }> = ({ team, role }) => (
        <Pressable onPress={() => handleTeamPress(team.id)} style={styles.teamCard}>
            <MaskedImage uri={team.logoUrl} size={LOGO_SIZE} radius={RADIUS} shadow />
            <Text
                style={[styles.teamLabel, { color: theme.text }]}
                numberOfLines={2}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.85}
            >
                {team.name}
            </Text>
            <Text style={[styles.teamRoleLabel, { color: theme.textInactive }]}>{role}</Text>
        </Pressable>
    );

    return (
        <GradientBorderView
            gradient={gradient}
            borderRadius={RADIUS}
            borderWidth={1}
            style={[styles.card, { backgroundColor: theme.background }]}
        >
            <View style={styles.headerRow}>
                <InfoPill label={enrichedMatch.pool.division.name} />
                {date ? <InfoPill label={date} /> : null}
            </View>

            <View style={styles.teamsRow}>
                <TeamBlock team={enrichedMatch.teamA} role="Home" />

                <View style={styles.centerBlock}>
                    {enrichedMatch.set ? (
                        <>
                            <GradientBorderView
                                gradient={gradient}
                                borderRadius={16}
                                borderWidth={2}
                                style={[styles.finalScoreBox, { backgroundColor: theme.background }]}
                            >
                                <Text style={[styles.finalScoreText, { color: theme.text }]}>
                                    {enrichedMatch.set}
                                </Text>
                            </GradientBorderView>
                            {time ? (
                                <InfoPill label={time} />
                            ) : null}
                        </>
                    ) : (
                        <>
                            {time ? <Text style={[styles.timeLarge, { color: theme.text }]}>{time}</Text> : null}
                            <InfoPillGradient label="À venir" gradient={gradient} />
                        </>
                    )}
                </View>

                <TeamBlock team={enrichedMatch.teamB} role="Away" />
            </View>
        </GradientBorderView>
    );
};

export default MatchScoreCard;

const styles = StyleSheet.create({
    card: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: RADIUS,
        gap: 10,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    teamsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    teamCard: {
        flex: 1,
        alignItems: "center",
        gap: 6,
    },
    teamLabel: {
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center",
    },
    teamRoleLabel: {
        fontSize: 12,
        fontWeight: "600",
    },
    centerBlock: {
        minWidth: 96,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    finalScoreBox: {
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    finalScoreText: {
        fontSize: 28,
        fontWeight: "800",
        letterSpacing: 0.3,
    },
    timeSubtle: {
        fontSize: 13,
        fontWeight: "600",
    },
    timeLarge: {
        fontSize: 32,
        fontWeight: "800",
    },
});