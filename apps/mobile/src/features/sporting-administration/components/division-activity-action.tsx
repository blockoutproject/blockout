import { Pressable, StyleSheet, Text } from "react-native";
import { LoadingIndicator } from "@/shared/components/loading-indicator";
import { controlOpacity } from "@/shared/components/control-styles";
import type { DivisionResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";

/** The editor owns the exact target and confirmation; Query owns recovery. This control presents and delegates the action. */
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
}: Readonly<DivisionActivityActionProps>) {
  const { colors } = useTheme();
  const unavailable = disabled || executing;
  const label = division.active
    ? "Désactiver la division"
    : "Réactiver la division";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: unavailable, busy: executing }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { opacity: controlOpacity(disabled && !executing, pressed) },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: division.active ? colors.error : colors.text,
            opacity: executing ? 0 : 1,
          },
        ]}
      >
        {label}
      </Text>
      {executing && (
        <LoadingIndicator
          color={division.active ? colors.error : colors.text}
          style={StyleSheet.absoluteFill}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: tokens.size.control.default,
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
