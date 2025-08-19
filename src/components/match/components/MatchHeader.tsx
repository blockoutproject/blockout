import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import { useBackOrClose } from "@/src/hooks/utils/useBackOrClose";

type MatchHeaderProps = {
    onCloseSheet: () => void;
    onOpenReport: () => void;
};

const MatchHeader: React.FC<MatchHeaderProps> = ({ onCloseSheet, onOpenReport }) => {
    const theme = useAppTheme();
    const { handleBack, canGoBack } = useBackOrClose(onCloseSheet);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack}>
                    <MaterialCommunityIcons
                        name={canGoBack ? "chevron-left" : "close"}
                        size={30}
                        color={theme.text}
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={onOpenReport} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="flag-outline" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default MatchHeader;

const styles = StyleSheet.create({
    container: { backgroundColor: "transparent" },
    header: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
    },
});