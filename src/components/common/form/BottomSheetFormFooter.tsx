import React from "react";
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { CORNERS } from "@/src/theme/globals";
import useKeyboardVisible from "@/src/hooks/utils/useKeyboardVisible";

export type BottomSheetFormFooterProps = BottomSheetFooterProps & {
    label: string;
    loading?: boolean;
    disabled?: boolean;
    onPress: () => void;
    backgroundColor?: string;
};

const BottomSheetFormFooter: React.FC<BottomSheetFormFooterProps> = ({
    label,
    loading,
    disabled,
    onPress,
    backgroundColor,
}) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const iskeyboardVisible = useKeyboardVisible();
    const bg = backgroundColor ?? theme.primary;
    return (
        <View
            style={[
                {
                    paddingBottom: iskeyboardVisible ? 0 : insets.bottom
                },
            ]}
        >
            <View
                style={[
                    styles.footer,
                    {
                        backgroundColor: theme.backgroundSecondary,
                        borderTopColor: theme.border,
                    },
                ]}
            >
                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: bg, opacity: loading || disabled ? 0.7 : 1 }]}
                    disabled={loading || disabled}
                    onPress={onPress}
                    activeOpacity={0.85}
                    testID="bottom-sheet-form-footer-submit"
                >
                    {loading ? (
                        <ActivityIndicator color={theme.text} />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="content-save-outline" size={18} color={theme.text} />
                            <Text style={[styles.submitText, { color: theme.text }]}>{label}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default BottomSheetFormFooter;

const styles = StyleSheet.create({
    footer: {
        padding: 12,
        borderTopWidth: 1,
        justifyContent: "center",
    },
    submitBtn: {
        borderRadius: CORNERS,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    submitText: {
        fontWeight: "800",
        fontSize: 16,
    },
});