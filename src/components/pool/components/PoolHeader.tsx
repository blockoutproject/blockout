import React from "react";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

type PoolHeaderProps = {
    title?: string;
    onOpenReport: () => void;
};

const PoolHeader: React.FC<PoolHeaderProps> = ({ title, onOpenReport }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <View style={{ paddingTop: insets.top }}>
            <View style={styles.header}>
                <View style={styles.leftGroup}>
                    <TouchableOpacity onPress={router.back} style={styles.backButton}>
                        <Ionicons
                            name={"chevron-back-outline"}
                            size={28 }
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
        paddingHorizontal: 12,
    },
    leftGroup: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
        flexGrow: 1,
    },
    backButton: { 
        marginRight: 4 
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        flexShrink: 1,
    },
});