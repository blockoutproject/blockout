import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle } from "react-native";
import { useThemeColor } from "@/src/hooks/useThemeColor";
import { BORDER_RADIUS, CORNERS } from "@/src/theme/globals";

/** Composant skeleton animé. */
export type SkeletonProps = {
    /** Largeur (par défaut "100%"). */
    width?: number | string;
    /** Hauteur (par défaut 100). */
    height?: number;
    /** Styles additionnels. */
    style?: ViewStyle;
    /** Forme : coins arrondis ou rayon constant. */
    variant?: "default" | "rounded";
};

export const Skeleton: React.FC<SkeletonProps> = ({
    width = "100%",
    height = 100,
    style,
    variant = "default",
}) => {
    const mutedColor = useThemeColor({}, "muted");
    const opacity = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.5,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                styles.base,
                {
                    width: width as any,
                    height,
                    backgroundColor: mutedColor,
                    borderRadius: variant === 'default' ? CORNERS : BORDER_RADIUS,
                    opacity,
                },
                style,
            ]}
        />
    );
};

const styles = StyleSheet.create({
    base: {
        overflow: "hidden",
    },
});