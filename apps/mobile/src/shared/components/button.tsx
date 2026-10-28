import { Image } from "expo-image";
import type { LucideIcon } from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens, type ContextColors } from "../theme/tokens";
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

/** Shared action: callers own effects, busy/selected state, contextual accent and the full accessible label. */
export interface ButtonProps {
  label: string;
  onPress: PressableProps["onPress"];
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Compact visuals retain a separate, non-overlapping native touch target. UI Library 3386:697. */
  size?: "regular" | "compact";
  /** Selected state is announced independently of the label, colour and busy state. */
  selected?: boolean;
  accessibilityHint?: string;
  /** Destination openings use link semantics; commands retain the default button role. */
  accessibilityRole?: "button" | "link";
  /** Effective #RRGGBB accent: inverse border or the primary action's approved context paint. */
  contextColor?: string;
  /** Three qualified authored primary-action stops; null/absence uses the primary-to-8%-darker default. */
  contextGradient?: readonly string[] | null;
  /** Caller-resolved black/white contrast against contextColor, independent of system appearance. */
  contextForeground?: string;
  /** Source-owned paints: gradient primary, flat success, bordered secondary or semantic inverse. */
  variant?: "primary" | "success" | "secondary" | "inverse";
  /** Decorative trailing glyph from the library; busy state replaces it with the shared indicator. */
  trailingIcon?: LucideIcon;
  /** Compact actions use this leading slot; when supplied it takes precedence over trailingIcon. */
  leadingIcon?: LucideIcon;
}

/** Presents approved action variants with source-owned paints and native unavailable states. */
export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  size = "regular",
  selected,
  accessibilityHint,
  accessibilityRole = "button",
  contextColor,
  contextGradient,
  contextForeground,
  variant = "primary",
  trailingIcon: TrailingIcon,
  leadingIcon: LeadingIcon,
}: ButtonProps) {
  const { context, colors, scheme } = useTheme();
  const contextualPrimary = variant === "primary" && contextColor !== undefined;
  const actionContext: ContextColors = contextualPrimary
    ? {
        primary: contextColor,
        actionStart: contextColor,
        actionEnd: darkerEndpoint(contextColor),
        onAction: contextForeground ?? context.onAction,
        shadow: scheme === "dark" ? "#00000033" : `${contextColor}1A`,
      }
    : context;
  const foreground =
    variant === "primary"
      ? actionContext.onAction
      : variant === "success"
        ? colors.onSuccessAction
        : variant === "inverse"
          ? colors.onInverse
          : colors.text;
  const Icon = LeadingIcon ?? TrailingIcon;
  const icon =
    Icon &&
    (loading ? (
      <LoadingIndicator color={foreground} />
    ) : (
      <Icon accessible={false} size={tokens.size.icon.md} color={foreground} />
    ));
  const gradient = fullWidth ? containerGradient : contentGradient;
  const stops =
    contextualPrimary && contextGradient
      ? contextGradient
      : [actionContext.actionStart, actionContext.actionEnd];
  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${gradient.width}" height="48" viewBox="0 0 ${gradient.width} 48" preserveAspectRatio="none">
    <defs><linearGradient id="fill" x1="${gradient.x1}" y1="${gradient.y1}" x2="${gradient.x2}" y2="${gradient.y2}" gradientUnits="userSpaceOnUse">
    ${stops.map((color, index) => `<stop offset="${index / (stops.length - 1)}" stop-color="${color}"/>`).join("")}</linearGradient></defs>
    <rect width="${gradient.width}" height="48" fill="url(#fill)"/></svg>`;
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
        selected,
      }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        fullWidth ? styles.container : styles.content,
        size === "compact" && styles.compactTarget,
      ]}
    >
      {({ pressed }) => (
        <View
          // Keep gradient and label parentage stable when opacity changes during native screen removal.
          collapsable={false}
          style={[
            styles.action,
            fullWidth ? styles.container : styles.content,
            size === "compact" && styles.compact,
            {
              backgroundColor:
                variant === "primary"
                  ? actionContext.primary
                  : variant === "success"
                    ? colors.successAction
                    : variant === "inverse"
                      ? colors.inverse
                      : colors.raised,
              borderWidth:
                variant === "secondary" || variant === "inverse"
                  ? tokens.border.thin
                  : 0,
              borderColor:
                variant === "inverse" && contextColor
                  ? `${contextColor}${colors.contextBorderAlpha}`
                  : colors.border,
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
                        color: actionContext.shadow,
                      },
                    ],
            },
          ]}
        >
          {variant === "primary" && (
            <Image
              accessible={false}
              source={{ uri: `data:image/svg+xml;base64,${btoa(background)}` }}
              recyclingKey={stops.join("/")}
              contentFit="fill"
              style={styles.gradient}
            />
          )}
          {LeadingIcon && icon}
          {loading && !Icon && <LoadingIndicator color={foreground} />}
          <Text
            style={[styles.label, { color: foreground }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
          {!LeadingIcon && icon}
        </View>
      )}
    </Pressable>
  );
}

/** UI Library Color 3193:125: mix a qualified six-digit primary with 8% black for its default endpoint. */
function darkerEndpoint(primary: string): string {
  return `#${[1, 3, 5]
    .map((start) =>
      Math.round(Number.parseInt(primary.slice(start, start + 2), 16) * 0.92)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

const styles = StyleSheet.create({
  compactTarget: {
    minHeight: tokens.touch.minimum,
    justifyContent: "center",
  },
  compact: {
    minHeight: tokens.size.control.compact,
    // Figma strokes are inset; native padding excludes the border to preserve the 36-point visual.
    paddingHorizontal: tokens.spacing.md - tokens.border.thin,
    paddingVertical: tokens.spacing.sm - tokens.border.thin,
    borderRadius: tokens.radius.full,
  },
  action: {
    minHeight: tokens.size.control.default,
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
  label: { ...tokens.typography.strong, flexShrink: 1, textAlign: "center" },
});
