import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import {
    Alert,
    Linking,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import FastImage from 'react-native-fast-image';
import { Team } from "@/src/types/Team";
import TeamStatsCard from "./TeamStatsCard";
import { useAppTheme } from "@/src/context/ThemeProvider";

type OpenLinkProps = {
    url: string;
    text: string;
};

type TeamInfoCardProps = {
    team: Team;
};

const OpenLink: React.FC<OpenLinkProps> = ({ url, text }) => {
    const theme = useAppTheme();

    const handlePress = async () => {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert(`Impossible d'ouvrir l'URL : ${url}`);
        }
    };

    return (
        <Pressable onPress={handlePress}>
            <Text style={[styles.link, { color: theme.text }]}>{text}</Text>
        </Pressable>
    );
};

const TeamInfoCard: React.FC<TeamInfoCardProps> = ({ team }) => {
    const theme = useAppTheme();

    return (
        <View style={{ backgroundColor: theme.background }}>
            <View style={styles.column}>
                <View style={styles.firstLine}>
                    <FastImage
                        source={require("@/assets/clubs/as_cannes.png")}
                        style={styles.teamLogo}
                        resizeMode="contain"
                    />
                    <TeamStatsCard team={team} />
                </View>
                <Text style={[styles.title, { color: theme.text }]}>{team.name}</Text>

                <View style={styles.data}>
                    <MaterialCommunityIcons
                        name="trophy-outline"
                        size={18}
                        color={theme.text}
                    />
                    <Text style={[styles.text, { color: theme.text }]}>{team.divisionName}</Text>
                </View>
                <View style={styles.data}>
                    <MaterialCommunityIcons
                        name="gender-male-female"
                        size={18}
                        color={theme.text}
                    />
                    <Text style={[styles.text, { color: theme.text }]}>{team.gender}</Text>
                </View>

                <View style={styles.data}>
                    <MaterialCommunityIcons
                        name="link-variant"
                        size={18}
                        color={theme.text}
                    />
                    <OpenLink
                        url="https://www.ascannesvolley.com/"
                        text="as-cannes.com"
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    column: {
        flexDirection: "column",
    },
    firstLine: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
    },
    teamLogo: {
        aspectRatio: 1,
        height: 110,
    },
    title: {
        fontWeight: "700",
        fontSize: 20,
        marginBottom: 10,
    },
    data: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 2,
    },
    text: {
        fontSize: 14,
    },
    link: {
        fontSize: 14,
    },
});

export default TeamInfoCard;