import { controlOpacity } from "./control-styles";
import { ChevronDown } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";

/** Controlled season trigger; callers own the displayed choice, available options and presentation. */
export interface SeasonSelectorProps {
  label: string;
  accessibilityLabel: string;
  disabled?: boolean;
  /** Supplied when the caller reveals choices inline; route-based presenters own their own state. */
  expanded?: boolean;
  onPress: () => void;
}

/** Shares the compact season pill and native touch target without owning selection or navigation. */
export function SeasonSelector({
  label,
  accessibilityLabel,
  disabled = false,
  expanded,
  onPress,
}: Readonly<SeasonSelectorProps>) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: label }}
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.target,
        {
          opacity: controlOpacity(disabled, pressed),
        },
      ]}
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            tokens.typography.label,
            { color: colors.text, flexShrink: 1 },
          ]}
        >
          {label}
        </Text>
        <ChevronDown
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.icon}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    minHeight: tokens.touch.minimum,
    justifyContent: "center",
    flexShrink: 1,
  },
  pill: {
    minHeight: 34,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
});
