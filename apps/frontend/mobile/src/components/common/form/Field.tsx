import { useAppTheme } from '@/src/context/ThemeProvider';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/** Controller field-state subset consumed by shared React Native form primitives. */
export type NativeFieldState = {
  error?: { message?: string };
  isTouched: boolean;
};

/** Props for a labeled field with transition-compatible validation feedback. */
export type FieldProps = {
  label?: string;
  children: React.ReactNode;
  fieldState?: NativeFieldState;
  error?: string;
  touched?: boolean;
};

const Field: React.FC<FieldProps> = ({
  label,
  children,
  fieldState,
  error,
  touched,
}) => {
  const theme = useAppTheme();
  const visibleError = fieldState?.error?.message ?? error;
  const isTouched = fieldState?.isTouched ?? touched ?? false;

  return (
    <View style={styles.fieldBlock}>
      {label && (
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      )}
      {children}
      {isTouched && visibleError ? (
        <Text style={[styles.error, { color: theme.error }]}>
          {visibleError}
        </Text>
      ) : null}
    </View>
  );
};

export default Field;

const styles = StyleSheet.create({
  fieldBlock: { marginBottom: 6 },
  error: { fontSize: 12, marginTop: 4, marginLeft: 8, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
});
