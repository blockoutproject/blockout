import { useState, type Ref } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextInputInstance,
} from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { FieldMessage } from "./field-message";

/** A native input contract; features retain values, validation, submission and secure-entry decisions. */
export interface TextFieldProps extends TextInputProps {
  /** Forwards form-owned native focus to this input after validation errors. */
  ref?: Ref<TextInputInstance>;
  label: string;
  helper?: string;
  error?: string;
}

/** Preserves the label and current draft while presenting helper/error and native focus semantics. */
export function TextField({
  label,
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
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
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
      <FieldMessage error={error} helper={helper} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: tokens.layout.form.labelGap },
  disabled: { opacity: tokens.opacity.disabled },
  label: tokens.typography.label,
  input: {
    ...tokens.typography.body,
    minHeight: tokens.size.control.default,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    padding: tokens.spacing.md,
  },
  // UI Library TextField multiline 162:175/control 162:177 owns this 96-point minimum without a variable.
  multiline: { minHeight: 96, textAlignVertical: "top" },
});
