import { ChevronDown } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";
import { useTheme } from "../theme/theme-provider";
import { FieldMessage } from "./field-message";

/** Controlled selection trigger; the caller owns options, navigation and the accepted value. */
export interface SelectFieldProps {
  label: string;
  value?: string;
  disabled?: boolean;
  helper?: string;
  error?: string;
  onPress: () => void;
}

/** UI Library Select 164:200, with the same field feedback as text and image controls. */
export function SelectField({
  label,
  value,
  disabled = false,
  helper,
  error,
  onPress,
}: SelectFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.field, disabled && styles.disabled]}>
      <Text style={[tokens.typography.label, { color: colors.text }]}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ?? "Choisir…" }}
        accessibilityHint={error ?? helper}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.control,
          {
            backgroundColor: colors.raised,
            borderColor: error ? colors.error : colors.border,
            opacity: pressed ? tokens.opacity.pressed : 1,
          },
        ]}
      >
        <Text
          numberOfLines={2}
          style={[
            styles.value,
            { color: value ? colors.text : colors.secondaryText },
          ]}
        >
          {value ?? "Choisir…"}
        </Text>
        <ChevronDown
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.icon}
        />
      </Pressable>
      <FieldMessage error={error} helper={helper} />
    </View>
  );
}
const styles = StyleSheet.create({
  field: { flex: 1, minWidth: 0, gap: tokens.layout.form.labelGap },
  control: {
    minHeight: tokens.size.control.default,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
  },
  value: { ...tokens.typography.strong, flex: 1 },
  disabled: { opacity: tokens.opacity.disabled },
});
