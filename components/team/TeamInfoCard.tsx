import { colors } from "@/constants/Colors";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useCallback } from "react";
import {
    Alert,
    Linking,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import FastImage from 'react-native-fast-image'
import { Team } from "@/types/Team";

type OpenLinkProps = {
    url: string;
    text: string;
};

type TeamInfoCardProps = {
    team: Team,
};

const OpenLink: React.FC<OpenLinkProps> = ({ url, text }: OpenLinkProps) => {
    const handlePress = useCallback(async () => {
        // Checking if the link is supported for links with custom URL scheme.
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            // Opening the link with some app, if the URL scheme is "http" the web link should be opened
            // by some browser in the mobile
            await Linking.openURL(url);
        } else {
            Alert.alert(`Don't know how to open this URL: ${url}`);
        }
    }, [url]);
    return (
        <Pressable onPress={handlePress}>
            <Text style={styles.link}>{text}</Text>
        </Pressable>
    );
};
const TeamInfoCard: React.FC<TeamInfoCardProps> = ({ team }) => {
    return (
        <View style={styles.container}>
            <View style={{ flexDirection: "column" }}>
                <FastImage
                    source={require("@/assets/clubs/as_cannes.png")}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>{team.name}</Text>
                <View style={styles.data}>
                    <MaterialCommunityIcons
                        name={"trophy-outline"}
                        size={20}
                        color={colors.light}
                    />
                    <Text style={styles.text}>{team.division_name}</Text>
                </View>
                {/* 🚨 L'info n'est pas encore gérée par l'API */}
                {/* <View style={styles.data}>
                    <MaterialCommunityIcons
                        name={"map-marker-outline"}
                        size={20}
                        color={colors.light}
                    />
                    <Text style={styles.text}>Palais des victoires</Text>
                </View> */}
                <View style={styles.data}>
                    <MaterialCommunityIcons
                        name={"link-variant"}
                        size={20}
                        color={colors.light}
                    />
                    <OpenLink
                        url="https://www.ascannesvolley.com/"
                        text="as-cannes.com"
                    />
                </View>
            </View>
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 15,
    },
    teamLogo: {
        aspectRatio: 1,
        height: 110,
        marginBottom: 10,
    },
    data: {
        flexDirection: "row",
        gap: 10,
    },
    text: {
        color: colors.light,
    },
    link: {
        color: "#419acb",
    },
    title: {
        color: colors.light,
        fontWeight: "600",
        fontSize: 26,
        paddingBottom: 5,
    },
    icon: {},
});

export default TeamInfoCard;
