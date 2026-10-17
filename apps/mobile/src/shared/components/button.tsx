import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { LoadingIndicator } from "./loading-indicator";

/** Primary regular action: the caller owns effects, busy state and the full accessible label. */
export interface ButtonProps {
  label: string;
  onPress: PressableProps["onPress"];
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

/** Implements the approved regular primary family without a generic variant or request-state engine. */
export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const { context } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        fullWidth ? styles.container : styles.content,
        {
          opacity: disabled
            ? tokens.opacity.disabled
            : pressed
              ? tokens.opacity.pressed
              : 1,
          boxShadow:
            disabled || pressed
              ? []
              : [
                  {
                    offsetX: tokens.elevation.offsetX,
                    offsetY: tokens.elevation.offsetY,
                    blurRadius: tokens.elevation.blur,
                    color: context.shadow,
                  },
                ],
        },
      ]}
    >
      <LinearGradient
        colors={[context.actionStart, context.actionEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      {loading && <LoadingIndicator color={context.onAction} />}
      <Text
        style={[
          styles.label,
          !fullWidth && styles.contentLabel,
          { color: context.onAction },
        ]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: tokens.size.control,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.control,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
  },
  gradient: { ...StyleSheet.absoluteFill, borderRadius: tokens.radius.control },
  container: { alignSelf: "stretch" },
  content: { alignSelf: "flex-start", maxWidth: "100%" },
  contentLabel: { maxWidth: 240 },
  label: { ...tokens.typography.strong, flexShrink: 1, textAlign: "center" },
});
