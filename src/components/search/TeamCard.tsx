import { TeamSearchDoc } from "@/src/types/docs/TeamSearchDoc";
import React from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/src/context/ThemeProvider";

/** Card for a team row. */
export interface TeamCardProps {
    /** Team data. */
    team: TeamSearchDoc;
    /** Press handler. */
    onPress: () => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onPress }) => {
    const theme = useAppTheme();

    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.card,
                {
                    backgroundColor: theme.surface,
                    shadowColor: theme.background,
                },
            ]}
            testID="team-card"
        >
            <Image
                source={
                    team.logoUrl
                        ? { uri: team.logoUrl }
                        : require("@/assets/clubs/default_club_logo.png")
                }
                style={[
                    styles.logo,
                    {
                        backgroundColor: theme.text,
                    },
                ]}
                contentFit="cover"
            />

            <View
                style={styles.content}
            >
                <Text
                    style={[
                        styles.name,
                        {
                            color: theme.text,
                        },
                    ]}
                >
                    {team.name}
                </Text>
                <Text
                    style={[
                        styles.details,
                        {
                            color: theme.textInactive,
                        },
                    ]}
                >
                    {team.divisionName} • {team.gender} • {team.season}
                </Text>
            </View>
        </Pressable>
    );
};

export default TeamCard;

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        marginBottom: 12,
        borderRadius: 20,
    },
    logo: {
        aspectRatio: 1,
        marginRight: 16,
        height: 50,
        borderRadius: 12,
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: "600",
    },
    details: {
        marginTop: 4,
    },
});