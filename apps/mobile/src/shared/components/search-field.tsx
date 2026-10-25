import { Search, X } from "lucide-react-native";
import { useState, type Ref } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { IconButton } from "./icon-button";

/** Native Search Field; the form owns text, validation and clearing, without truncating its draft. */
export interface SearchFieldProps extends TextInputProps {
  ref?: Ref<TextInputInstance>;
  label: string;
  error?: string;
  onClear: () => void;
}

/** Projects UI Library Input/Search through the approved search toolbar, including its conditional clear action. */
export function SearchField({
  label,
  error,
  onClear,
  value,
  onFocus,
  onBlur,
  style,
  ...input
}: SearchFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <View
        style={[
          styles.control,
          {
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Search
          accessible={false}
          color={colors.icon}
          size={tokens.size.controlIcon}
          nonScalingStroke
        />
        <TextInput
          {...input}
          value={value}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={colors.secondaryText}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, { color: colors.text }, style]}
        />
        {!!value && (
          <IconButton
            label="Effacer la recherche"
            size="control"
            onPress={onClear}
            disabled={input.editable === false || input.readOnly === true}
          >
            <X
              accessible={false}
              color={colors.icon}
              size={tokens.size.controlIcon}
              nonScalingStroke
            />
          </IconButton>
        )}
        <View
          pointerEvents="none"
          accessible={false}
          style={[
            StyleSheet.absoluteFill,
            styles.edge,
            {
              borderColor: error
                ? colors.error
                : focused
                  ? colors.focus
                  : colors.border,
            },
          ]}
        />
      </View>
      {error && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.error, { color: colors.error }]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: tokens.spacing.label },
  control: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    minHeight: tokens.size.control,
    borderRadius: tokens.radius.control,
    paddingLeft: tokens.spacing.md,
    paddingRight: tokens.spacing.xs,
    overflow: "hidden",
  },
  // The inside stroke keeps the field at 48 points when its 48-point clear target appears.
  edge: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.control,
  },
  input: {
    ...tokens.typography.body,
    flex: 1,
    minWidth: 0,
    paddingVertical: tokens.spacing.md,
  },
  error: { ...tokens.typography.metadata },
});
