import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";

type ErrorStateProps = {
    message?: string;
    onRetry: () => void;
};

const ErrorState: React.FC<ErrorStateProps> = ({
    message = "Oups ! Une erreur est survenue.",
    onRetry,
}) => {
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.card, { borderColor: withAlpha(theme.text, 0.08), backgroundColor: theme.surface }]}>
                <View style={styles.illustrationWrap}>
                    <Image
                        source={require("@/assets/images/error-dino.png")}
                        style={[styles.image, { backgroundColor: theme.text }]}
                        resizeMode="contain"
                    />
                </View>

                <Text
                    style={[styles.title, { color: theme.text }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                >
                    {message}
                </Text>

                <Pressable
                    onPress={onRetry}
                    android_ripple={{ color: withAlpha(theme.text, 0.08) }}
                    style={({ pressed }) => [
                        styles.retryButton,
                        {
                            backgroundColor: pressed
                                ? withAlpha(theme.primary, 0.9)
                                : theme.primary,
                        },
                    ]}
                >
                    <MaterialCommunityIcons
                        name="refresh"
                        size={16}
                        color={theme.text}
                    />
                    <Text style={[styles.retryText, { color: theme.text }]}>
                        Réessayer
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

export default ErrorState;

const AVATAR_SHADOW = {
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
    },

    card: {
        width: "100%",
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 16,
        alignItems: "center",
        gap: 14,
    },

    illustrationWrap: {
        ...AVATAR_SHADOW,
        borderRadius: 18,
    },
    image: {
        width: 160,
        height: 160,
        borderRadius: 18,
    },

    title: {
        textAlign: "center",
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 0.2,
        paddingHorizontal: 8,
    },

    retryButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 999,
    },
    retryText: {
        fontSize: 14,
        fontWeight: "800",
        letterSpacing: 0.2,
    },
});