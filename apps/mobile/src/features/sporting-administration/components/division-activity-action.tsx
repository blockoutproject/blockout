import { Pressable, StyleSheet, Text } from "react-native";
import { LoadingIndicator } from "../../../shared/components/loading-indicator";
import type { DivisionResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";

/** The editor owns revision and confirmation; Query owns recovery. This control presents and delegates the action. */
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
      style={({ pressed }) => [
        styles.action,
        {
          opacity:
            disabled && !executing
              ? tokens.opacity.disabled
              : pressed
                ? tokens.opacity.pressed
                : 1,
        },
      ]}
    >
      {executing && (
        <LoadingIndicator
          color={division.active ? colors.error : colors.text}
        />
      )}
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
    flexDirection: "row",
    gap: tokens.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...tokens.typography.metadata,
    textDecorationLine: "underline",
    flexShrink: 1,
  },
});
