import React, { memo } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, DimensionValue } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { CORNERS } from "@/src/theme/globals";
import { withAlpha } from "@/src/utils/utils";

type InfoPillProps = {
    label?: string;
    style?: StyleProp<ViewStyle>;
    leftIconName?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    leftIconSize?: number;
    overlayAlpha?: number;
    overlayColor?: string;
    blurEnabled?: boolean;
    blurTint?: "light" | "dark" | "default";
    labelStyle?: StyleProp<TextStyle>;
    shadowEnabled?: boolean;
    shadowLevel?: 0 | 1 | 2 | 3 | 4 | 5;
    shadowColor?: string;
    maxWidth?: DimensionValue;

    showRedDot?: boolean;
    redDotSize?: number;
    redDotColor?: string;

    /** Nouveau : version compacte */
    small?: boolean;
};

const GAP = 6;
const GAP_SMALL = 4;

const BLUR_INTENSITY = 20;

const ELEV = [0, 2, 4, 6, 8, 12] as const;
const RAD = [0, 2, 3, 4, 6, 8] as const;
const OFFY = [0, 1, 1, 2, 2, 3] as const;
const OPAC = [0, 0.12, 0.16, 0.18, 0.2, 0.22] as const;

function clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
}

function shadow(level: 0 | 1 | 2 | 3 | 4 | 5, color: string): ViewStyle {
    const i = Math.max(0, Math.min(5, level));
    return {
        elevation: ELEV[i],
        shadowColor: color,
        shadowRadius: RAD[i],
        shadowOpacity: OPAC[i],
        shadowOffset: { width: 0, height: OFFY[i] },
    };
}

const InfoPill: React.FC<InfoPillProps> = ({
    label,
    style,
    leftIconName,
    leftIconSize = 14,
    overlayAlpha = 1,
    overlayColor,
    blurEnabled = false,
    blurTint = "default",
    labelStyle,
    shadowEnabled = false,
    shadowLevel = 2,
    shadowColor,
    maxWidth,
    showRedDot = false,
    redDotSize = 7,
    redDotColor,
    small = false,
}) => {
    const theme = useAppTheme();

    const baseColor = overlayColor ?? theme.surface;
    const overlayBg = withAlpha(baseColor, clamp01(overlayAlpha));
    const showBlur = blurEnabled && overlayAlpha < 1;
    const shColor = shadowColor ?? theme.text;

    const flattened = StyleSheet.flatten(labelStyle);
    const textColor = flattened?.color ?? theme.text;

    const dotColor = redDotColor ?? theme.error;
    const dotSize = small ? Math.max(3, redDotSize - 3) : Math.max(4, redDotSize);

    return (
        <View
            style={[
                styles.wrapper,
                { borderRadius: CORNERS },
                shadowEnabled ? shadow(shadowLevel, shColor) : null,
            ]}
        >
            <View
                style={[
                    styles.pill,
                    {
                        backgroundColor: showBlur ? "transparent" : overlayBg,
                        borderColor: withAlpha(theme.text, 0.12),
                        borderRadius: CORNERS,
                        maxWidth,
                        paddingVertical: small ? 3 : 6,
                        paddingHorizontal: small ? 6 : 8,
                    },
                    style,
                ]}
            >
                {showBlur ? (
                    <BlurView
                        tint={blurTint}
                        intensity={BLUR_INTENSITY}
                        style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayBg }]}
                        pointerEvents="none"
                    />
                ) : null}

                <View
                    style={[
                        styles.row,
                        { gap: small ? GAP_SMALL : GAP },
                    ]}
                >
                    {leftIconName ? (
                        <MaterialCommunityIcons
                            name={leftIconName}
                            size={small ? leftIconSize - 4 : leftIconSize}
                            color={textColor}
                        />
                    ) : null}
                    {label ? (
                        <Text
                            style={[
                                styles.text,
                                {
                                    color: textColor,
                                    fontSize: small ? 10 : 12,
                                    fontWeight: small ? "600" : "700",
                                },
                                labelStyle,
                            ]}
                            numberOfLines={1}
                        >
                            {label}
                        </Text>
                    ) : null}

                    {showRedDot ? (
                        <View
                            style={{
                                width: dotSize,
                                height: dotSize,
                                borderRadius: dotSize / 2,
                                backgroundColor: dotColor,
                            }}
                        />
                    ) : null}
                </View>
            </View>
        </View>
    );
};

export default memo(InfoPill);

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: CORNERS,
    },
    pill: {
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        fontSize: 12,
        fontWeight: "700",
    },
});