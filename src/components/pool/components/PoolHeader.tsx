import React from "react";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
                        <MaterialCommunityIcons
                            name={canGoBack ? "chevron-left" : "close"}
                            size={30}
                            color={theme.text}
                        />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                        {title}
                    </Text>
                </View>

                <TouchableOpacity onPress={onOpenReport} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="flag-outline" size={24} color={theme.text} />
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
        paddingHorizontal: 12,
    },
    leftGroup: { flexDirection: "row", alignItems: "center", flex: 1 },
    backButton: { marginRight: 8 },
    title: { fontSize: 18, fontWeight: "700" },
});