import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import { useBackOrClose } from "@/src/hooks/utils/useBackOrClose";

type LegalDocumentHeaderProps = {
    title: string;
    onCloseSheet?: () => void;
    onEdit?: () => void;
};

const LegalDocumentHeader: React.FC<LegalDocumentHeaderProps> = ({ title, onCloseSheet, onEdit }) => {
    const theme = useAppTheme();
    const { handleBack, canGoBack } = useBackOrClose(onCloseSheet);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.leftGroup}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name={canGoBack ? "chevron-back-outline" : "close"} size={canGoBack ? 30 : 35} color={theme.text} />
                    </TouchableOpacity>

                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                        {title}
                    </Text>
                </View>

                {onEdit ? (
                    <TouchableOpacity
                        onPress={onEdit}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="pencil" size={22} color={theme.text} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 30 }} />
                )}
            </View>
        </View>
    );
};

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
});

export default LegalDocumentHeader;