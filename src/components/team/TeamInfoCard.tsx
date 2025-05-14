import { colors } from "@/src/constants/Colors";
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

type OpenLinkProps = {
    url: string;
    text: string;
};

type TeamInfoCardProps = {
    team: Team;
};

const OpenLink: React.FC<OpenLinkProps> = ({ url, text }) => {
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
            <Text style={styles.link}>{text}</Text>
        </Pressable>
    );
};

const TeamInfoCard: React.FC<TeamInfoCardProps> = ({ team }) => {
    return (
        <View style={styles.container}>
            <View style={styles.column}>
                <FastImage
                    source={require("@/assets/clubs/as_cannes.png")}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>{team.name}</Text>

                <View style={styles.data}>
                    <MaterialCommunityIcons
                        name="trophy-outline"
                        size={20}
                        color={colors.light}
                    />
                    <Text style={styles.text}>{team.divisionName}</Text>
                </View>

                {/* Future API info */}
                {/* <View style={styles.data}>
                    <MaterialCommunityIcons
                        name="map-marker-outline"
                        size={20}
                        color={colors.light}
                    />
                    <Text style={styles.text}>Palais des victoires</Text>
                </View> */}

                <View style={styles.data}>
                    <MaterialCommunityIcons
                        name="link-variant"
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
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 15,
    },
    column: {
        flexDirection: "column",
    },
    teamLogo: {
        aspectRatio: 1,
        height: 110,
        marginBottom: 10,
    },
    title: {
        color: colors.light,
        fontWeight: "600",
        fontSize: 26,
        paddingBottom: 5,
    },
    data: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
    },
    text: {
        color: colors.light,
        fontSize: 14,
    },
    link: {
        color: colors.blue,
        fontSize: 14,
    },
});

export default TeamInfoCard;