import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { Division } from "@/src/types/Division";
import ConfigApi from "@/src/api/ConfigApi";

type DivisionItemProps = {
    division: Division;
    onPress: () => void;
    onDeactivated: () => void;
};

const DivisionItem: React.FC<DivisionItemProps> = ({ division, onPress, onDeactivated }) => {
    const theme = useAppTheme();

    const handlePress = () => {
        Haptics.selectionAsync();
        onPress();
    };

    const handleDeactivate = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await ConfigApi.getInstance().deactivateDivision(division.id);
            onDeactivated();
        } catch (error) {
            console.error("Erreur lors de la désactivation :", error);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.surface }]}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <Text style={[styles.id, { color: theme.textInactive }]}>#{division.id}</Text>

            {division.logoUrl ? (
                <Image source={{ uri: division.logoUrl }} style={styles.avatar} contentFit="contain" />
            ) : (
                <View style={[styles.avatar, { backgroundColor: theme.border }]} />
            )}

            <View style={styles.textContainer}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {division.name}
                </Text>
                <Text
                    style={[
                        styles.status,
                        { color: division.active ? theme.success : theme.error },
                    ]}
                >
                    {division.active ? "Active" : "Inactive"}
                </Text>
            </View>

            <View
                style={[styles.colorCircle, { backgroundColor: division.mainColor, borderColor: theme.border }]}
            />

            <LinearGradient
                colors={[
                    division.firstGradientColor,
                    division.secondGradientColor,
                    division.thirdGradientColor,
                ]}
                style={[styles.colorCircle, { marginRight: 8, borderColor: theme.border }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {division.active && (
                <TouchableOpacity onPress={handleDeactivate}>
                    <MaterialCommunityIcons
                        name="close"
                        size={20}
                        color={theme.textInactive}
                        style={{ marginLeft: 16 }}
                    />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

export default DivisionItem;

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 16,
        marginBottom: 12,
    },
    id: {
        fontSize: 12,
        width: 20,
        textAlign: "left",
    },
    avatar: {
        width: 40,
        aspectRatio: 1,
        borderRadius: 12,
        marginHorizontal: 8,
        backgroundColor: "#ccc",
    },
    textContainer: { flex: 1, paddingHorizontal: 8 },
    name: { fontSize: 14, fontWeight: "600" },
    status: { fontSize: 12, marginTop: 4 },
    colorCircle: {
        width: 30,
        height: 30,
        borderRadius: 20,
        marginHorizontal: 4,
        borderWidth: 1,
    },
});