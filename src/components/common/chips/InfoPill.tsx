import React, { memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    StyleProp,
    ViewStyle,
    TextStyle,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { BlurView } from "expo-blur";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { CORNERS } from "@/src/theme/globals";
import { withAlpha } from "@/src/utils/utils";

type Props = {
    label: string;
    style?: StyleProp<ViewStyle>;
    leftIconName?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    leftIconSize?: number;

    /** Opacité du fond (0..1). 1 = opaque, <1 = translucide */
    overlayAlpha?: number;
    /** Couleur de fond de l’overlay (par défaut: theme.surface) */
    overlayColor?: string;

    /** Flou d’arrière-plan si overlayAlpha < 1 */
    blurEnabled?: boolean;
    blurTint?: "light" | "dark" | "default";

    /** Style du texte */
    labelStyle?: StyleProp<TextStyle>;

    /** Ombre */
    shadowEnabled?: boolean;
    shadowLevel?: 0 | 1 | 2 | 3 | 4 | 5;
    shadowColor?: string;
};

const GAP = 6;
const BLUR_INTENSITY = 20;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const ELEV = [0, 2, 4, 6, 8, 12] as const;
const RAD = [0, 2, 3, 4, 6, 8] as const;
const OFFY = [0, 1, 1, 2, 2, 3] as const;
const OPAC = [0, 0.12, 0.16, 0.18, 0.2, 0.22] as const;

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

const InfoPill: React.FC<Props> = memo(
    ({
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
                        },
                        style,
                    ]}
                >
                    {showBlur && (
                        <BlurView
                            tint={blurTint}
                            intensity={BLUR_INTENSITY}
                            style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayBg }]}
                            pointerEvents="none"
                        />
                    )}

                    <View style={styles.row}>
                        {leftIconName ? (
                            <MaterialCommunityIcons
                                name={leftIconName}
                                size={leftIconSize}
                                color={textColor}
                            />
                        ) : null}
                        <Text style={[styles.text, { color: textColor }, labelStyle]} numberOfLines={1}>
                            {label}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }
);

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