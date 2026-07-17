import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';
import type { NativeFieldState } from './Field';

type FieldErrorProps = {
  fieldState?: NativeFieldState;
  error?: string;
  touched?: boolean;
};

const FieldError: React.FC<FieldErrorProps> = ({
  fieldState,
  error,
  touched,
}) => {
  const theme = useAppTheme();
  const visibleError = fieldState?.error?.message ?? error;
  const isTouched = fieldState?.isTouched ?? touched ?? false;

  if (!isTouched || !visibleError) return null;
  return (
    <Text style={[styles.err, { color: theme.error }]}>{visibleError}</Text>
  );
};

export default FieldError;

const styles = StyleSheet.create({
  err: { fontSize: 12, fontWeight: '700' },
});
