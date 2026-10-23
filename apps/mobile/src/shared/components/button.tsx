import { Image } from "expo-image";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { LoadingIndicator } from "./loading-indicator";

// UI Library 156:5 and 156:79 SVG endpoints, with export shadow padding (10, 6) removed.
// The SVG preserves this paint when stretched; normalized native endpoints change it as the aspect ratio changes.
// Expo LinearGradient comparison: specs/003-shared-quality/research.md#native-ui-projection-and-system-appearance.
const contentGradient = {
  width: 102,
  x1: 3.1135,
  y1: -5.815698,
  x2: 102.364,
  y2: 47.3194,
};
const containerGradient = {
  width: 320,
  x1: 29.6077,
  y1: -51.282,
  x2: 290.392,
  y2: 99.282,
};

/** Regular action: the caller owns effects, busy state, variant and the full accessible label. */
export interface ButtonProps {
  label: string;
  onPress: PressableProps["onPress"];
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Approved flat success or bordered secondary action; primary retains its context gradient. */
  variant?: "primary" | "success" | "secondary";
  /** Decorative trailing glyph from the library; busy state replaces it with the shared indicator. */
  trailingIcon?: LucideIcon;
}

/** Presents approved action variants with source-owned paints and native unavailable states. */
export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  variant = "primary",
  trailingIcon: TrailingIcon,
}: ButtonProps) {
  const { context, colors } = useTheme();
  const foreground =
    variant === "primary"
      ? context.onAction
      : variant === "success"
        ? colors.onSuccessAction
        : colors.text;
  const gradient = fullWidth ? containerGradient : contentGradient;
  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${gradient.width}" height="48" viewBox="0 0 ${gradient.width} 48" preserveAspectRatio="none">
    <defs><linearGradient id="fill" x1="${gradient.x1}" y1="${gradient.y1}" x2="${gradient.x2}" y2="${gradient.y2}" gradientUnits="userSpaceOnUse">
    <stop stop-color="${context.actionStart}"/><stop offset="1" stop-color="${context.actionEnd}"/></linearGradient></defs>
    <rect width="${gradient.width}" height="48" fill="url(#fill)"/></svg>`;
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
          backgroundColor:
            variant === "primary"
              ? context.primary
              : variant === "success"
                ? colors.successAction
                : colors.raised,
          borderWidth: variant === "secondary" ? tokens.borderWidth : 0,
          borderColor: colors.border,
          opacity: disabled
            ? tokens.opacity.disabled
            : pressed
              ? tokens.opacity.pressed
              : 1,
          boxShadow:
            disabled || pressed || variant !== "primary"
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
      {variant === "primary" && (
        <Image
          accessible={false}
          source={{ uri: `data:image/svg+xml;base64,${btoa(background)}` }}
          recyclingKey={`${context.actionStart}/${context.actionEnd}`}
          contentFit="fill"
          style={styles.gradient}
        />
      )}
      {loading && !TrailingIcon && <LoadingIndicator color={foreground} />}
      <Text
        style={[
          styles.label,
          !fullWidth && styles.contentLabel,
          { color: foreground },
        ]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
      {TrailingIcon &&
        (loading ? (
          <LoadingIndicator color={foreground} />
        ) : (
          <TrailingIcon
            accessible={false}
            size={tokens.size.controlIcon}
            color={foreground}
          />
        ))}
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
