import { View, Text, Pressable, StyleSheet } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { useAppTheme } from "@/src/context/ThemeProvider";

type Props = ErrorBoundaryProps;

export default function ErrorFallback({ error, retry }: Props) {
    const theme = useAppTheme();
    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: theme.text }]}>Oups ! 🤯</Text>
            <Text style={styles.message}>{error.message}</Text>

            {/* Exemple : relancer la route ou fermer un bottom-sheet */}
            <Pressable style={styles.button} onPress={retry}>
                <Text style={styles.buttonText}>Réessayer</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
    message: { textAlign: "center", paddingHorizontal: 24, marginBottom: 20 },
    button: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: "#1e40af" },
    buttonText: { color: "white", fontWeight: "600" },
});