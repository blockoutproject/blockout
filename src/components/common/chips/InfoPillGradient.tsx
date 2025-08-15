import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { CORNERS } from "@/src/theme/globals";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import GradientView from "@/src/components/common/GradientView";

type Variant = "border" | "filled";

type Props = {
    label: string;
    gradient: readonly [string, string, ...string[]];
    variant?: Variant;
    onPress?: () => void;
    disabled?: boolean;
    borderWidth?: number;
    maxWidth?: number;
    icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    iconSize?: number;
};

const BASE_VPAD = 6;
const BASE_HPAD = 10;
const GAP = 6;

const InfoPillGradient: React.FC<Props> = memo(
    ({
        label,
        gradient,
        variant = "border",
        onPress,
        disabled,
        borderWidth = 1,
        maxWidth,
        icon,
        iconSize = 14,
    }) => {
        const theme = useAppTheme();
        const delta = variant === "border" ? borderWidth : 0;
        const padV = Math.max(2, BASE_VPAD - delta);
        const padH = Math.max(4, BASE_HPAD - delta);

        const Content = (
            <View
                style={[
                    styles.inner,
                    {
                        paddingVertical: padV,
                        paddingHorizontal: padH,
                        borderRadius: CORNERS - Math.min(CORNERS / 2, delta),
                        backgroundColor: variant === "border" ? theme.surface : "transparent",
                    },
                    maxWidth ? { maxWidth } : undefined,
                ]}
            >
                {icon ? (
                    <MaterialCommunityIcons name={icon} size={iconSize} color={theme.text} />
                ) : null}
                <Text style={[styles.text, { color: theme.text }]} numberOfLines={1}>
                    {label}
                </Text>
            </View>
        );

        if (variant === "filled") {
            return (
                <GradientView gradient={gradient} style={[styles.outer, { borderRadius: CORNERS }]}>
                    {onPress ? (
                        <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={disabled}>
                            {Content}
                        </TouchableOpacity>
                    ) : (
                        Content
                    )}
                </GradientView>
            );
        }

        return (
            <GradientBorderView
                gradient={gradient}
                borderRadius={CORNERS}
                borderWidth={borderWidth}
                style={styles.outer}
            >
                {onPress ? (
                    <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={disabled}>
                        {Content}
                    </TouchableOpacity>
                ) : (
                    Content
                )}
            </GradientBorderView>
        );
    }
);

export default InfoPillGradient;

const styles = StyleSheet.create({
    outer: {
        borderRadius: CORNERS,
    },
    inner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: GAP,
    },
    text: {
        fontSize: 12,
        fontWeight: "700",
    },
});