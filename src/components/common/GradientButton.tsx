// src/components/common/GradientButton.tsx
import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

type Props = {
    onPress: () => Promise<void> | void;
    disabled?: boolean;
    loading?: boolean;
    /** Libellé affiché à l'état normal */
    label: string;
    /** Libellé affiché quand loading = true (ex: "Connexion…") */
    loadingLabel?: string;
    /** Icône à gauche (affichée seulement quand !loading par défaut) */
    leftIcon?: React.ReactNode;
    /** Forcer l’icône même pendant le chargement */
    showLeftIconWhenLoading?: boolean;
    style?: ViewStyle;
    /** Couleur du texte (par défaut noir, adapté à ton gradient clair) */
    textColor?: string;
};

const ctaGradient: [string, string, string] = ['#6EE7F9', '#A78BFA', '#F472B6'];

export const GradientButton: React.FC<Props> = ({
    onPress,
    disabled,
    loading,
    label,
    loadingLabel,
    leftIcon,
    showLeftIconWhenLoading = false,
    style,
    textColor = '#000000',
}) => {
    const handlePress = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await onPress();
        } catch {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const isDisabled = disabled || loading;

    return (
        <Pressable
            onPress={handlePress}
            style={[styles.pressable, style]}
            disabled={isDisabled}
            accessibilityRole="button"
        >
            <LinearGradient
                colors={ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, loading && { opacity: 0.75 }]}
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
        </Pressable>
    );
};

const styles = StyleSheet.create({
    pressable: {
        alignSelf: 'center',
        borderRadius: 999,
        overflow: 'hidden',
    },
    button: {
        height: 54,
        minWidth: 140,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
    },
    innerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    leftIcon: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
});