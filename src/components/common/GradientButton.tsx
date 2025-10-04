import React, { useCallback } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewStyle,
    GestureResponderEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

export type GradientButtonProps = {
    /** Callback au press */
    onPress: () => Promise<void> | void;
    /** Désactive le bouton */
    disabled?: boolean;
    /** Affiche l’état de chargement */
    loading?: boolean;
    /** Libellé par défaut */
    label: string;
    /** Libellé pendant le chargement */
    loadingLabel?: string;
    /** Icône à gauche */
    leftIcon?: React.ReactNode;
    /** Affiche l’icône même en chargement */
    showLeftIconWhenLoading?: boolean;
    /** Style du conteneur pressable (wrapper externe) */
    style?: ViewStyle;
    /** Couleur du texte et du spinner */
    textColor?: string;
    /** Largeur adaptative */
    fullWidth?: boolean;
};

const CTA_GRADIENT: [string, string, string] = ["#6EE7F9", "#A78BFA", "#F472B6"];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GradientButton: React.FC<GradientButtonProps> = ({
    onPress,
    disabled,
    loading,
    label,
    loadingLabel,
    leftIcon,
    showLeftIconWhenLoading = false,
    style,
    textColor = "#000000",
    fullWidth,
}) => {
    const scale = useSharedValue(1);

    const isDisabled = !!disabled || !!loading;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(
        (_e: GestureResponderEvent) => {
            if (!isDisabled) scale.value = withSpring(0.98, { damping: 20, stiffness: 250 });
        },
        [isDisabled, scale]
    );

    const handlePressOut = useCallback(
        (_e: GestureResponderEvent) => {
            scale.value = withSpring(1, { damping: 20, stiffness: 250 });
        },
        [scale]
    );

    const handlePress = useCallback(async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await onPress();
        } catch {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [onPress]);

    return (
        <AnimatedPressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            style={[
                styles.pressable,
                fullWidth ? styles.fullWidth : null,
                animatedStyle,
                style,
            ]}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy: !!loading }}
            testID="gradient-button"
        >
            <LinearGradient
                colors={CTA_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, loading && styles.buttonLoading, fullWidth && styles.buttonFull]}
            >
                <View style={styles.innerRow}>
                    {leftIcon && (showLeftIconWhenLoading || !loading) ? (
                        <View style={styles.leftIcon}>{leftIcon}</View>
                    ) : null}

                    {loading ? (
                        <>
                            <ActivityIndicator size="small" color={textColor} />
                            <Text style={[styles.text, { color: textColor }]}>
                                {loadingLabel ?? label}
                            </Text>
                        </>
                    ) : (
                        <Text style={[styles.text, { color: textColor }]}>{label}</Text>
                    )}
                </View>
            </LinearGradient>
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    pressable: {
        alignSelf: "center",
        borderRadius: 999,
        overflow: "hidden",
    },
    fullWidth: {
        alignSelf: "stretch",
    },
    button: {
        height: 54,
        minWidth: 140,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
    },
    buttonLoading: {
        opacity: 0.75,
    },
    buttonFull: {
        width: "100%",
    },
    innerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    leftIcon: {
        justifyContent: "center",
        alignItems: "center",
    },
    text: {
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 0.3,
    },
});

export default GradientButton;