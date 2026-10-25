import { useState, type Ref } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type TextInputInstance,
} from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** A native input contract; features retain values, validation, submission and secure-entry decisions. */
export interface TextFieldProps extends TextInputProps {
  /** Forwards form-owned native focus to this input after validation errors. */
  ref?: Ref<TextInputInstance>;
  label: string;
  /** Domain compositions may use the approved compact HEX-label treatment. */
  labelStyle?: StyleProp<TextStyle>;
  helper?: string;
  error?: string;
}

/** Preserves the label and current draft while presenting helper/error and native focus semantics. */
export function TextField({
  label,
  labelStyle,
  helper,
  error,
  editable = true,
  readOnly,
  multiline = false,
  onFocus,
  onBlur,
  style,
  ...input
}: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const isEditable = readOnly !== undefined ? !readOnly : editable;
  return (
    <View style={[styles.field, !isEditable && styles.disabled]}>
      <Text style={[styles.label, { color: colors.text }, labelStyle]}>
        {label}
      </Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        accessibilityHint={error ?? helper}
        accessibilityState={{ disabled: !isEditable }}
        editable={isEditable}
        multiline={multiline}
        placeholderTextColor={colors.secondaryText}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            color: colors.text,
            backgroundColor: colors.raised,
            borderColor: error
              ? colors.error
              : focused
                ? colors.focus
                : colors.border,
          },
          style,
        ]}
      />
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.message, { color: colors.error }]}
        >
          {error}
        </Text>
      ) : helper ? (
        <Text style={[styles.message, { color: colors.secondaryText }]}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: tokens.spacing.label },
  disabled: { opacity: tokens.opacity.disabled },
  label: tokens.typography.label,
  input: {
    ...tokens.typography.body,
    minHeight: tokens.size.control,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.control,
    padding: tokens.spacing.md,
  },
  multiline: { minHeight: tokens.size.multiline, textAlignVertical: "top" },
  message: tokens.typography.metadata,
});
