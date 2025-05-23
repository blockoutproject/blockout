import { Team } from "@/src/types/Team";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";

type TeamStatsCardProps = {
    team: Team;
};

const TeamStatsCard: React.FC<TeamStatsCardProps> = ({ team }) => {
    const theme = useAppTheme();
    const lastFiveResults = [true, false, false, true, true];

    const Stat = ({ total, description }: { total: number; description: string }) => (
        <View style={styles.statContainer}>
            <Text style={[styles.statValue, { color: theme.text }]}>{total}</Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>{description}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.statsRow}>
                <Stat total={1} description="place" />
                <Stat total={4} description="victoires" />
                <Stat total={6} description="défaites" />
            </View>
            <View style={styles.resultsRow}>
                {lastFiveResults.map((isVictory, idx) => (
                    <View
                        key={`result-${idx}`}
                        style={[
                            styles.resultBadge,
                            { backgroundColor: isVictory ? theme.success : theme.error },
                        ]}
                    >
                        <Text style={[styles.resultText, { color: theme.text }]}>{isVictory ? "V" : "D"}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 10,
        alignItems: "center",
    },
    statsRow: {
        flexDirection: "row",
        gap: 15,
    },
    statContainer: {
        alignItems: "center",
    },
    statValue: {
        fontWeight: "700",
        fontSize: 32,
    },
    statLabel: {
        fontWeight: "400",
        fontSize: 14,
    },
    resultsRow: {
        flexDirection: "row",
        gap: 5,
    },
    resultBadge: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 7,
    },
    resultText: {
        fontWeight: "600",
        fontSize: 16,
    },
});

export default TeamStatsCard;