import React, { useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ImageSourcePropType,
    ViewStyle,
    StyleProp,
    Animated,
    ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";

type Action = {
    label: string;
    onPress: () => void;
    icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    testID?: string;
    loading?: boolean;   // ⟵ NEW
    disabled?: boolean;  // ⟵ NEW
};

export type StateViewProps = {
    title: string;
    subtitle?: string;
    illustrationSource?: ImageSourcePropType;
    fallbackIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    action?: Action;
    containerStyle?: StyleProp<ViewStyle>;
    testID?: string;
};

const StateCard: React.FC<StateViewProps> = ({
    title,
    subtitle,
    illustrationSource,
    fallbackIcon,
    action,
    containerStyle,
    testID,
}) => {
    const theme = useAppTheme();

    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }, [fade]);

    const onPressAction = async () => {
        if (!action || action.disabled || action.loading) return;
        await Haptics.selectionAsync();
        action.onPress();
    };

    const isActionDisabled = Boolean(action?.disabled || action?.loading);

    return (
        <Animated.View
            style={[styles.root, { backgroundColor: theme.background, opacity: fade }, containerStyle]}
            testID={testID}
            accessibilityRole="summary"
        >
            <View style={styles.centerStack}>
                {/* Illustration / Icône */}
                <View
                    style={[styles.visualWrap, { backgroundColor: withAlpha(theme.text, 0.06) }]}
                    accessible
                    accessibilityLabel="Illustration"
                >
                    {illustrationSource ? (
                        <Image source={illustrationSource} style={styles.image} contentFit="contain" />
                    ) : (
                        <MaterialCommunityIcons
                            name={fallbackIcon ?? "information-outline"}
                            size={44}
                            color={withAlpha(theme.text, 0.6)}
                        />
                    )}
                </View>

                {/* Titre / Sous-titre */}
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={2} accessibilityRole="header">
                    {title}
                </Text>
                {!!subtitle && (
                    <Text
                        style={[styles.subtitle, { color: theme.textInactive }]}
                        numberOfLines={4}
                        accessibilityHint={subtitle}
                    >
                        {subtitle}
                    </Text>
                )}

                {/* Action */}
                {action && (
                    <Pressable
                        onPress={onPressAction}
                        disabled={isActionDisabled}
                        android_ripple={{ color: withAlpha(theme.text, 0.12) }}
                        style={({ pressed }) => [
                            styles.button,
                            {
                                backgroundColor: pressed && !isActionDisabled
                                    ? withAlpha(theme.primary, 0.9)
                                    : theme.primary,
                                opacity: isActionDisabled ? 0.7 : 1,
                            },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={action.label}
                        testID={action.testID}
                    >
                        {action.loading ? (
                            <>
                                <ActivityIndicator size="small" color={theme.text} />
                                <Text style={[styles.buttonText, { color: theme.text }]}>Chargement…</Text>
                            </>
                        ) : (
                            <>
                                {action.icon && (
                                    <MaterialCommunityIcons name={action.icon} size={16} color={theme.text} />
                                )}
                                <Text style={[styles.buttonText, { color: theme.text }]}>{action.label}</Text>
                            </>
                        )}
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
};

export default StateCard;

const styles = StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 16 },
    centerStack: { alignItems: "center", justifyContent: "center", paddingTop: 24, paddingBottom: 24, gap: 12 },
    visualWrap: { width: 120, height: 120, borderRadius: 28, alignItems: "center", justifyContent: "center" },
    image: { width: 120, height: 120, borderRadius: 24 },
    title: { marginTop: 4, textAlign: "center", fontSize: 20, fontWeight: "900", letterSpacing: 0.2, paddingHorizontal: 8 },
    subtitle: { textAlign: "center", fontSize: 14, lineHeight: 20, paddingHorizontal: 8, maxWidth: 320 },
    button: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999 },
    buttonText: { fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
});