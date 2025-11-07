import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { CORNERS } from "@/src/theme/globals";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import GradientView from "@/src/components/common/GradientView";

type Variant = "border" | "filled";
type Size = "md" | "lg";

type InfoPillGradientProps = {
    /** Libellé. */
    label?: string;
    /** Dégradé. */
    gradient: readonly [string, string, ...string[]];
    /** Variante. */
    variant?: Variant;
    /** Taille de la pill (md = défaut, lg = +2 de padding H/V). */
    size?: Size;
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
    /** Couleur du texte (fallback theme.text). */
    textColor?: string;
};

const BASE_VPAD = 6;
const BASE_HPAD = 10;
const GAP = 6;
const ICON_SIZE = 14;

const InfoPillGradient: React.FC<InfoPillGradientProps> = ({
    label,
    gradient,
    variant = "border",
    size = "md",
    onPress,
    disabled,
    borderWidth = 1,
    maxWidth,
    leftIcon,
    rightIcon,
    textColor,
}) => {
    const theme = useAppTheme();

    const delta = variant === "border" ? borderWidth : 0;

    // +2 sur H/V en mode lg
    const add = size === "lg" ? 2 : 0;
    const baseV = BASE_VPAD + add;
    const baseH = BASE_HPAD + add;

    const padV = Math.max(2, baseV - delta);
    const padH = Math.max(4, baseH - delta);

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
            {leftIcon ? (
                <MaterialCommunityIcons name={leftIcon} size={ICON_SIZE} color={theme.text} />
            ) : null}
            {label && (
                <Text style={[styles.text, { color: textColor ?? theme.text }]} numberOfLines={1}>
                    {label}
                </Text>
            )}
            {rightIcon ? <Ionicons name={rightIcon} size={ICON_SIZE} color={theme.text} /> : null}
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

export default memo(InfoPillGradient);

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
        flexShrink: 1,
        fontSize: 12,
        fontWeight: "700",
    },
});