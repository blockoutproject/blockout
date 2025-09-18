import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { CORNERS } from "@/src/theme/globals";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import GradientView from "@/src/components/common/GradientView";

type Variant = "border" | "filled";

type InfoPillGradientProps = {
    /** Libellé. */
    label: string;
    /** Dégradé. */
    gradient: readonly [string, string, ...string[]];
    /** Variante. */
    variant?: Variant;
    /** Press. */
    onPress?: () => void;
    /** Désactivation. */
    disabled?: boolean;
    /** Largeur du bord en mode border. */
    borderWidth?: number;
    /** Largeur max. */
    maxWidth?: number;
    /** Icône gauche (MDI). */
    leftIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    /** Icône droite (Ionicons). */
    rightIcon?: React.ComponentProps<typeof Ionicons>["name"];
    /** Taille des icônes. */
    iconSize?: number;
};

const BASE_VPAD = 6;
const BASE_HPAD = 10;
const GAP = 6;

const InfoPillGradient: React.FC<InfoPillGradientProps> = ({
    label,
    gradient,
    variant = "border",
    onPress,
    disabled,
    borderWidth = 1,
    maxWidth,
    leftIcon,
    rightIcon,
    iconSize = 14
}) => {
    const theme = useAppTheme();

    const delta = variant === "border" ? borderWidth : 0;
    const padV = Math.max(2, BASE_VPAD - delta);
    const padH = Math.max(4, BASE_HPAD - delta);

    const content = (
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
            {leftIcon ? <MaterialCommunityIcons name={leftIcon} size={iconSize} color={theme.text} /> : null}
            <Text style={[styles.text, { color: theme.text }]} numberOfLines={1}>
                {label}
            </Text>
            {rightIcon ? <Ionicons name={rightIcon} size={iconSize} color={theme.text} /> : null}
        </View>
    );

    if (variant === "filled") {
        return (
            <GradientView gradient={gradient} style={[styles.outer, { borderRadius: CORNERS }]}>
                {onPress ? (
                    <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={disabled}>
                        {content}
                    </TouchableOpacity>
                ) : (
                    content
                )}
            </GradientView>
        );
    }

    return (
        <GradientBorderView gradient={gradient} borderRadius={CORNERS} borderWidth={borderWidth} style={styles.outer}>
            {onPress ? (
                <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={disabled}>
                    {content}
                </TouchableOpacity>
            ) : (
                content
            )}
        </GradientBorderView>
    );
};

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