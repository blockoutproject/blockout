import React from "react";
import { Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";

type FieldErrorProps = { error?: string; touched?: boolean };

const FieldError: React.FC<FieldErrorProps> = ({ error, touched }) => {
    const theme = useAppTheme();
    if (!touched || !error) return null;
    return <Text style={[styles.err, { color: theme.error }]}>{error}</Text>;
};

export default FieldError;

const styles = StyleSheet.create({
    err: { fontSize: 12, fontWeight: "700" },
});