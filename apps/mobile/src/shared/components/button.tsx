import { controlOpacity } from "./control-styles";
import type { LucideIcon } from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { type Theme, useTheme } from "@/shared/theme/theme-provider";
import { solidForeground } from "@/shared/theme/solid-foreground";
import { tokens, type ContextColors } from "@/shared/theme/tokens";
import { LoadingIndicator } from "./loading-indicator";

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
  /** Effective #RRGGBB accent for contextual actions or an inverse outline. */
  contextColor?: string;
  /** Three qualified authored primary-action stops; null/absence uses the primary-to-8%-darker default. */
  contextGradient?: readonly string[] | null;
  /** Caller-resolved black/white contrast against contextColor, independent of system appearance. */
  contextForeground?: string;
  /** Source-owned paints, including flat destructive confirmation from UI Library 7000:4103. */
  variant?:
    "primary" | "solid" | "success" | "destructive" | "secondary" | "inverse";
  /** Set false for a solid action without a stroke; other callers retain their variant's border. */
  bordered?: boolean;
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
  bordered = true,
  trailingIcon: TrailingIcon,
  leadingIcon: LeadingIcon,
}: Readonly<ButtonProps>) {
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
  const { foreground, backgroundColor } =
    variant === "solid" && contextColor
      ? {
          foreground: contextForeground ?? solidForeground(contextColor),
          backgroundColor: contextColor,
        }
      : buttonPaints(variant, actionContext, colors);
  const Icon = LeadingIcon ?? TrailingIcon;
  const icon =
    Icon &&
    (loading ? (
      <LoadingIndicator color={foreground} />
    ) : (
      <Icon accessible={false} size={tokens.size.icon.md} color={foreground} />
    ));
  const stops =
    contextualPrimary && contextGradient
      ? contextGradient
      : [actionContext.actionStart, actionContext.actionEnd];
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
          // Keep the label's native parent stable during opacity changes and screen removal.
          collapsable={false}
          style={[
            styles.action,
            fullWidth ? styles.container : styles.content,
            size === "compact" && styles.compact,
            size === "compact" && !bordered && styles.compactBorderless,
            {
              backgroundColor,
              backgroundImage:
                variant === "primary"
                  ? `linear-gradient(120deg, ${stops.join(", ")})`
                  : undefined,
              borderWidth:
                bordered && (variant === "secondary" || variant === "inverse")
                  ? tokens.border.thin
                  : 0,
              borderColor:
                variant === "inverse" && contextColor
                  ? `${contextColor}${colors.contextBorderAlpha}`
                  : colors.border,
              opacity: controlOpacity(disabled, pressed),
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
          {LeadingIcon && icon}
          <Text
            style={[
              styles.label,
              { color: foreground, opacity: loading && !Icon ? 0 : 1 },
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
          {!LeadingIcon && icon}
          {loading && !Icon && (
            <LoadingIndicator
              color={foreground}
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

/** Resolves the paired foreground/background roles for one approved action variant. */
function buttonPaints(
  variant: ButtonProps["variant"],
  context: ContextColors,
  colors: Theme["colors"],
) {
  switch (variant) {
    case "primary":
      return { foreground: context.onAction, backgroundColor: context.primary };
    case "success":
      return {
        foreground: colors.onSuccessAction,
        backgroundColor: colors.successAction,
      };
    case "destructive":
      return {
        foreground: colors.onDangerAction,
        backgroundColor: colors.dangerAction,
      };
    case "solid":
    case "inverse":
      return { foreground: colors.onInverse, backgroundColor: colors.inverse };
    default:
      return { foreground: colors.text, backgroundColor: colors.raised };
  }
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
  compactBorderless: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
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
  container: { alignSelf: "stretch" },
  content: { alignSelf: "flex-start", maxWidth: "100%" },
  label: { ...tokens.typography.strong, flexShrink: 1, textAlign: "center" },
});
