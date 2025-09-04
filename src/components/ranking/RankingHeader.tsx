import React from "react";
import { TouchableOpacity, View, Text, StyleSheet, StyleSheet as RNStyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import MaskedImage from "../common/images/MaskedImage";
import { withAlpha } from "@/src/utils/utils";

type Props = {
    division: any;
    theme: any;
    onPress: () => void;
};

const RankingHeader: React.FC<Props> = ({ division, theme, onPress }) => {
    const divisionLogo = division.logoUrl
        ? { uri: division.logoUrl }
        : require("@/assets/clubs/default_club_logo.png");

    return (
        <TouchableOpacity activeOpacity={1} onPress={onPress}>
            <Image
                source={divisionLogo}
                style={RNStyleSheet.absoluteFill}
                contentFit="cover"
                blurRadius={60}
                transition={0}
            />
            <LinearGradient
                pointerEvents="none"
                colors={[
                    withAlpha(theme.surface, 0.8),
                    withAlpha(theme.surface, 0.5),
                    withAlpha(theme.surface, 0.8),
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={RNStyleSheet.absoluteFill}
            />
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <MaskedImage uri={division.logoUrl} size={24} radius={6} shadow />
                    <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                        {division.name} - Classement
                    </Text>
                </View>
                <Ionicons
                    name="chevron-forward-outline"
                    size={22}
                    color={withAlpha(theme.text, 0.8)}
                />
            </View>
        </TouchableOpacity>
    );
};

export default RankingHeader;

const styles = StyleSheet.create({
    headerRow: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        flex: 1,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 0.2,
    },
});