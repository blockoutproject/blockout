import { Pressable, StyleSheet, Text } from "react-native";
import type { DivisionResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";

/** The editor owns the revision and confirmation; Query owns command recovery. this control renders the lifecycle action and delegates its event to that owner. */
export interface DivisionActivityActionProps {
  division: DivisionResponse;
  executing: boolean;
  disabled: boolean;
  onPress(): void;
}

/** Product Design 1368:10291 places the confirmed lifecycle command after the presentation save. */
export function DivisionActivityAction({
  division,
  executing,
  disabled,
  onPress,
}: DivisionActivityActionProps) {
  const { colors } = useTheme();
  const busy = disabled || executing;
  const label = division.active
    ? "Désactiver la division"
    : "Réactiver la division";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy: executing }}
      disabled={busy}
      onPress={onPress}
      style={[styles.action, busy && styles.disabled]}
    >
      <Text
        style={[
          styles.label,
          { color: division.active ? colors.error : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  action: {
    minHeight: tokens.size.control,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...tokens.typography.metadata, textDecorationLine: "underline" },
  disabled: { opacity: tokens.opacity.disabled },
});
