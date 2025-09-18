import React, { memo } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { CORNERS } from "@/src/theme/globals";
import { withAlpha } from "@/src/utils/utils";

type InfoPillProps = {
    /** Libellé. */
    label: string;
    /** Style du conteneur. */
    style?: StyleProp<ViewStyle>;
    /** Icône gauche (MDI). */
    leftIconName?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    /** Taille de l’icône gauche. */
    leftIconSize?: number;
    /** Opacité d’overlay (0..1). */
    overlayAlpha?: number;
    /** Couleur d’overlay (défaut: theme.surface). */
    overlayColor?: string;
    /** Active le blur si overlayAlpha < 1. */
    blurEnabled?: boolean;
    /** Teinte du BlurView. */
    blurTint?: "light" | "dark" | "default";
    /** Style du texte. */
    labelStyle?: StyleProp<TextStyle>;
    /** Ombre activée. */
    shadowEnabled?: boolean;
    /** Niveau d’ombre. */
    shadowLevel?: 0 | 1 | 2 | 3 | 4 | 5;
    /** Couleur d’ombre. */
    shadowColor?: string;
};

const GAP = 6;
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
}) => {
    const theme = useAppTheme();

    const baseColor = overlayColor ?? theme.surface;
    const overlayBg = withAlpha(baseColor, clamp01(overlayAlpha));
    const showBlur = blurEnabled && overlayAlpha < 1;
    const textColor = theme.text;
    const shColor = shadowColor ?? theme.text;

    return (
        <View style={[styles.wrapper, { borderRadius: CORNERS }, shadowEnabled ? shadow(shadowLevel, shColor) : null]}>
            <View
                style={[
                    styles.pill,
                    {
                        backgroundColor: showBlur ? "transparent" : overlayBg,
                        borderColor: withAlpha(theme.text, 0.12),
                        borderRadius: CORNERS,
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

                <View style={styles.row}>
                    {leftIconName ? <MaterialCommunityIcons name={leftIconName} size={leftIconSize} color={textColor} /> : null}
                    <Text style={[styles.text, { color: textColor }, labelStyle]} numberOfLines={1}>
                        {label}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default InfoPill;

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: CORNERS,
    },
    pill: {
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: 6,
        paddingHorizontal: 10,
        overflow: "hidden",
    },
    row: {
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