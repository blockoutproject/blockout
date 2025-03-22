import { colors } from "@/src/constants/Colors";
import { Team } from "@/src/types/Team";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type TeamStatsCardProps = {
    team: Team,
};

const TeamStatsCard: React.FC<TeamStatsCardProps> = ({ team }) => {
    type StatProps = {
        total: number;
        description: string;
    };
    const Stat = ({ total, description }: StatProps) => (
        <View style={{ alignItems: "center" }}>
            <Text style={[styles.text, styles.title]}>{total}</Text>
            <Text style={[styles.text, styles.subtitle]}>{description}</Text>
        </View>
    );
    const lastFiveResults = [true, false, false, true, true];
    return (
        <View style={styles.container}>
            <View style={{ flexDirection: "row", gap: 15 }}>
                <Stat total={1} description="place" />
                <Stat total={4} description="victoires" />
                <Stat total={6} description="défaites" />
            </View>
            <View style={{ flexDirection: "row", gap: 5 }}>
                {lastFiveResults.map((isVictory, idx) => (
                    <View
                        style={{
                            ...styles.result,
                            backgroundColor: isVictory
                                ? colors.green
                                : colors.red,
                        }}
                        key={`result-${idx}`}
                    >
                        <Text style={styles.text}>{isVictory ? "V" : "D"}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        gap: 10,
        padding: 10,
        alignItems: "center",
    },
    text: {
        color: colors.light,
        fontWeight: "600",
        fontSize: 16,
    },
    title: {
        color: colors.light,
        fontWeight: "800",
        fontSize: 32,
    },
    subtitle: {
        color: colors.light,
        fontWeight: "400",
        fontSize: 14,
        marginTop: -5,
    },
    result: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 7,
    },
});

export default TeamStatsCard;