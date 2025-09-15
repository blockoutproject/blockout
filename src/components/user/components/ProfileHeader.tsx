import React from "react";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import { useBackOrClose } from "@/src/hooks/utils/useBackOrClose";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UserHeaderProps = {
    title: string;
    onOpenReport: () => void;
};

const ProfileHeader: React.FC<UserHeaderProps> = ({ title, onOpenReport }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { handleBack, canGoBack } = useBackOrClose();

    return (
        <View style={{ paddingTop: insets.top }}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                    {title}
                </Text>

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

export default ProfileHeader;

const styles = StyleSheet.create({
    header: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
    },
    title: {         
        fontSize: 18,
        fontWeight: '900',
    }
});