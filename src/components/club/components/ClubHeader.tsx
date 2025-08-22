import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import { useBackOrClose } from "@/src/hooks/utils/useBackOrClose";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type ClubHeaderProps = {
    title: string;
    onCloseSheet: () => void;
    onOpenReport: () => void;
};

const ClubHeader: React.FC<ClubHeaderProps> = ({ title, onCloseSheet, onOpenReport }) => {
    const theme = useAppTheme();
    const { handleBack, canGoBack } = useBackOrClose(onCloseSheet);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.leftGroup}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons
                            name={canGoBack ? "chevron-back-outline" : "close"}
                            size={25}
                            color={theme.text}
                        />
                    </TouchableOpacity>

                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                        {title}
                    </Text>
                </View>

                <View style={styles.rightGroup}>
                    <TouchableOpacity
                        onPress={onOpenReport}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.iconBtn}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="flag-outline" size={22} color={theme.text} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default ClubHeader;

const styles = StyleSheet.create({
    container: { backgroundColor: "transparent" },
    header: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
    },
    leftGroup: { flexDirection: "row", alignItems: "center", flex: 1 },
    backButton: { marginRight: 4 },
    title: { fontSize: 18, fontWeight: "700" },
    rightGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconBtn: { padding: 4 },
});