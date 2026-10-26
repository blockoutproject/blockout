import { useRouter } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import type { ClassificationTarget } from "../api/classification";

/** UI Library Select 164:200; native stack presentation owns the options and dismissal. */
export function ClassificationSelect({
  target,
  field,
  label,
  value,
  disabled,
  error,
}: {
  target: ClassificationTarget;
  field: "divisionId" | "format" | "gender";
  label: string;
  value?: string;
  disabled: boolean;
  error?: string;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.field, disabled && styles.disabled]}>
      <Text style={[tokens.typography.label, { color: colors.text }]}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ?? "Choisir…" }}
        accessibilityHint={error}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() =>
          router.push({
            pathname: "/administration/classification-selection",
            params: { ...target, field },
          })
        }
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
          size={tokens.size.inlineIcon}
          color={colors.icon}
        />
      </Pressable>
      {error && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[tokens.typography.metadata, { color: colors.error }]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  field: { flex: 1, minWidth: 0, gap: tokens.spacing.label },
  control: {
    minHeight: tokens.size.control,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.control,
  },
  value: { ...tokens.typography.strong, flex: 1 },
  disabled: { opacity: tokens.opacity.disabled },
});
