import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import { useBackOrClose } from "@/src/hooks/utils/useBackOrClose";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type MatchHeaderProps = {
    onCloseSheet: () => void;
};

const MatchHeader: React.FC<MatchHeaderProps> = ({ onCloseSheet }) => {
    const theme = useAppTheme();
    const { handleBack, canGoBack } = useBackOrClose(onCloseSheet);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack}>
                    <MaterialCommunityIcons name={canGoBack ? "chevron-left" : "close"} size={30} color={theme.text} />
                </TouchableOpacity>

                {/* Actions à droite si besoin plus tard */}
                <View style={{ width: 30 }} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "transparent",
    },
    header: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
    },
});

export default MatchHeader;