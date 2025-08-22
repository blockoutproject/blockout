import React from "react";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import { useBackOrClose } from "@/src/hooks/utils/useBackOrClose";

type PoolHeaderProps = {
    title?: string;
    onCloseSheet: () => void;
    onOpenReport: () => void;
};

const PoolHeader: React.FC<PoolHeaderProps> = ({ title, onCloseSheet, onOpenReport }) => {
    const theme = useAppTheme();
    const { handleBack, canGoBack } = useBackOrClose(onCloseSheet);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.leftGroup}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons
                            name={canGoBack ? "chevron-back-outline" : "close"}
                            size={canGoBack ? 30 : 35}
                            color={theme.text}
                        />
                    </TouchableOpacity>

                    <Text
                        style={[styles.title, { color: theme.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {title}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={onOpenReport}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons name="flag-outline" size={28} color={theme.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default PoolHeader;

const styles = StyleSheet.create({
    container: { backgroundColor: "transparent" },
    header: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
    },
    leftGroup: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
        flexGrow: 1,
    },
    backButton: { marginRight: 4 },
    title: {
        fontSize: 16,
        fontWeight: "700",
        flexShrink: 1,
    },
});