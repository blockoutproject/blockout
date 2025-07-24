import React from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

type ErrorPromptProps = {
    title?: string;
    subtitle?: string;
    onRetry?: () => void;
    retryLabel?: string;
    home?: boolean;
};

const ErrorPrompt: React.FC<ErrorPromptProps> = ({
    title = "Une erreur est survenue",
    subtitle = "Quelque chose s’est mal passé. Réessaie plus tard.",
    onRetry,
    retryLabel = "Réessayer",
    home = false,
}) => {
    const theme = useAppTheme();

    const CustomView = home ? View : BottomSheetScrollView;

    return (
        <CustomView style={[styles.container, { backgroundColor: theme.background }]}>
            <Image
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/564/564619.png" }}
                style={[styles.image, { tintColor: theme.error }]}
                contentFit="contain"
            />
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: theme.textInactive }]}>
                {subtitle}
            </Text>
            {onRetry && (
                <TouchableOpacity onPress={onRetry} style={styles.button}>
                    <Text style={[styles.retryLabel, { color: theme.primary }]}>
                        {retryLabel}
                    </Text>
                </TouchableOpacity>
            )}
        </CustomView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: 120,
        height: 120,
        marginBottom: 24,
        opacity: 0.8,
    },
    title: {
        fontSize: 22,
        fontWeight: "600",
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        textAlign: "center",
        maxWidth: 280,
        lineHeight: 22,
    },
    button: {
        marginTop: 16,
    },
    retryLabel: {
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
});

export default ErrorPrompt;