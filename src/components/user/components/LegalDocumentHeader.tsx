import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { SheetStackParamList } from "../../common/BottomSheetNavigator";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";

type LegalDocumentHeaderProps = {
    title: string;
    onCloseSheet?: () => void;
    onEdit?: () => void;
};

const LegalDocumentHeader: React.FC<LegalDocumentHeaderProps> = ({ title, onCloseSheet, onEdit }) => {
    const theme = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<SheetStackParamList>>();

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else if (onCloseSheet) {
            onCloseSheet();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.leftGroup}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <MaterialCommunityIcons name="close" size={30} color={theme.text} />
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
    leftGroup: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    backButton: {
        marginRight: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
    },
});

export default LegalDocumentHeader;