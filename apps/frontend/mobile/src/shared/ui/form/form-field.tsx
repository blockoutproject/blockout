import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { spacing, typography, useAppTheme } from "@/src/shared/theme";

export type FormFieldProps = {
  children: React.ReactNode;
  label?: string;
  error?: string;
  helper?: string;
  touched?: boolean;
};

/**
 * Owns the canonical label and helper anatomy around a feature-controlled form input.
 */
export function FormField({
  children,
  label,
  error,
  helper,
  touched,
}: FormFieldProps) {
  const theme = useAppTheme();
  const visibleError = touched ? error : undefined;
  const message = visibleError ?? helper;

  return (
    <View style={styles.field}>
      {label ? (
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      ) : null}
      {children}
      {message ? (
        <Text
          style={[
            styles.message,
            { color: visibleError ? theme.error : theme.textInactive },
          ]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  label: {
    ...typography.label,
  },
  message: {
    ...typography.metadata,
  },
});
