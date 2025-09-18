import React, { memo } from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { INFOCHIP_METRICS } from "./InfoChip";
import GradientView from "../GradientView";

type InfoChipGradientProps = {
    /** Icône gauche (MDI). Alias: leftIcon. */
    firstIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    /** Icône droite (Ionicons). Alias: rightIcon. */
    secondIcon?: React.ComponentProps<typeof Ionicons>["name"];
    /** Icône gauche (préférée si fournie). */
    leftIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    /** Icône droite (préférée si fournie). */
    rightIcon?: React.ComponentProps<typeof Ionicons>["name"];
    /** Dégradé. */
    gradient: readonly [string, string, ...string[]];
    /** Callback press. */
    onPress?: () => void;
    /** Désactivation. */
    disabled?: boolean;
    /** Largeur max. */
    maxWidth?: number;
};

const InfoChipGradient: React.FC<InfoChipGradientProps> = ({
    firstIcon,
    secondIcon,
    leftIcon,
    rightIcon,
    gradient,
    onPress,
    disabled,
    maxWidth
}) => {
    const theme = useAppTheme();

    const left = leftIcon ?? firstIcon;
    const right = rightIcon ?? secondIcon;

    const content = (
        <View
            style={[
                styles.inner,
                {
                    paddingVertical: INFOCHIP_METRICS.vpad,
                    paddingHorizontal: INFOCHIP_METRICS.hpad,
                    gap: 4,
                },
                maxWidth ? { maxWidth } : undefined,
            ]}
        >
            {left ? <MaterialCommunityIcons name={left} size={14} color={theme.text} /> : null}
            {right ? <Ionicons name={right} size={14} color={theme.text} /> : null}
        </View>
    );

    return (
        <GradientView gradient={gradient} style={[styles.outer, { backgroundColor: theme.background }]}>
            {onPress ? (
                <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={disabled} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    {content}
                </TouchableOpacity>
            ) : (
                content
            )}
        </GradientView>
    );
};

export default InfoChipGradient;

const styles = StyleSheet.create({
    outer: {
        borderRadius: INFOCHIP_METRICS.radius,
    },
    inner: {
        flexDirection: "row",
        alignItems: "center",
    },
});