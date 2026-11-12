import { Image, type ImageProps } from "expo-image";
import type { ImageSelection } from "../images/use-image-selection";
import { ImageFallback } from "./image-fallback";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { LoadingIndicator } from "./loading-indicator";
import { FieldMessage } from "./field-message";
import { useNativeImageLifecycle } from "../images/use-native-image-lifecycle";
import { RoundedContainedImage } from "./rounded-contained-image";

/** Stable caller identity and accessible description for an existing or prepared local image. */
export interface ImageFieldImage {
  id: string;
  uri: string;
  label: string;
}

/**
 * Controlled image display and actions; `selection` is the caller-owned native picker/preparation lifecycle.
 * The caller retains accepted values and supplies safe French validation messages. The shared owner
 * hides native diagnostics; feature owners validate bytes and decide removal/restoration semantics.
 * `multiple` only exposes the add action beside existing images; configure the same policy on the owner.
 */
export interface ImageFieldProps {
  /** Optional visible heading; action labels retain their accessible names. */
  label?: string;
  images: readonly ImageFieldImage[];
  selection: ImageSelection;
  /** Omit when the current image permits replacement but no removal. */
  onRemove?: (id: string) => void;
  multiple?: boolean;
  disabled?: boolean;
  /** Uses the published standard or compact image/action composition. */
  size?: "standard" | "compact";
  chooseLabel?: string;
  /** Image fitting only; use contain for logos. This does not transform selected assets. */
  contentFit?: "cover" | "contain";
  replaceLabel?: string;
  removeLabel?: string;
  helper?: string;
  error?: string;
}

/** Displays passive images and the caller-owned selection, replacement and removal actions. */
export function ImageField({
  label,
  images,
  selection,
  onRemove,
  multiple = false,
  disabled = false,
  size = "standard",
  chooseLabel = "Choisir une image",
  contentFit = "cover",
  replaceLabel = "Changer l’image",
  removeLabel = "Supprimer l’image",
  helper,
  error,
}: Readonly<ImageFieldProps>) {
  const { colors } = useTheme();
  const busy = selection.pending;
  const unavailable = disabled || busy;
  const compact = size === "compact";

  return (
    <View
      // Keep image and action parentage stable as the disabled opacity ends during a native save transition.
      collapsable={false}
      style={[styles.field, disabled && styles.disabled]}
    >
      {label && (
        <Text style={[tokens.typography.label, { color: colors.text }]}>
          {label}
        </Text>
      )}
      {images.map((image) => (
        <View key={image.id} style={styles.field}>
          <View
            style={[
              styles.body,
              compact && styles.compact,
              {
                backgroundColor: colors.surface,
                borderColor: error ? colors.error : colors.border,
              },
            ]}
          >
            <ImageThumbnail
              image={image}
              compact={compact}
              contentFit={contentFit}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${replaceLabel} : ${image.label}`}
              accessibilityHint={error ?? helper}
              accessibilityState={{ disabled: unavailable, busy }}
              disabled={unavailable}
              onPress={() => selection.select(image.id)}
              style={({ pressed }) => [
                styles.action,
                { opacity: pressed ? tokens.opacity.pressed : 1 },
              ]}
            >
              {busy && <LoadingIndicator color={colors.icon} />}
              <Text style={[styles.label, { color: colors.text }]}>
                {replaceLabel}
              </Text>
            </Pressable>
          </View>
          {onRemove && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${removeLabel} : ${image.label}`}
              accessibilityState={{ disabled: unavailable }}
              disabled={unavailable}
              onPress={() => onRemove?.(image.id)}
              style={({ pressed }) => [
                styles.remove,
                compact && styles.compactRemove,
                { opacity: pressed ? tokens.opacity.pressed : 1 },
              ]}
            >
              <Text
                style={[styles.removeLabel, { color: colors.secondaryText }]}
              >
                {removeLabel}
              </Text>
            </Pressable>
          )}
        </View>
      ))}
      {(images.length === 0 || multiple) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={chooseLabel}
          accessibilityHint={error ?? helper}
          accessibilityState={{ disabled: unavailable, busy }}
          disabled={unavailable}
          onPress={() => selection.select()}
          style={({ pressed }) => [
            styles.body,
            compact && styles.compact,
            {
              backgroundColor: colors.surface,
              borderColor: error ? colors.error : colors.border,
              opacity: pressed ? tokens.opacity.pressed : 1,
            },
          ]}
        >
          <View
            style={[
              styles.thumbnail,
              compact && styles.compactThumbnail,
              {
                backgroundColor: error
                  ? colors.subtle
                  : colors.mediaPlaceholder,
              },
            ]}
          >
            {busy ? (
              <LoadingIndicator color={colors.icon} />
            ) : (
              <ImageFallback size={tokens.size.icon.lg} color={colors.icon} />
            )}
          </View>
          <Text style={[styles.label, { color: colors.text }]}>
            {chooseLabel}
          </Text>
        </Pressable>
      )}
      <FieldMessage error={error} helper={helper} />
    </View>
  );
}

/** One retained attachment owns its native thumbnail decode; failure keeps the slot and caller's file/actions intact. */
function ImageThumbnail({
  image,
  compact,
  contentFit,
}: Readonly<{
  image: ImageFieldImage;
  compact: boolean;
  contentFit: NonNullable<ImageFieldProps["contentFit"]>;
}>) {
  const { colors } = useTheme();
  const nativeImage = useNativeImageLifecycle(image.uri);
  const thumbnailProps = {
    source: { uri: image.uri },
    accessible: true,
    accessibilityRole: "image",
    accessibilityLabel: `Miniature : ${image.label}`,
    cachePolicy: "none",
    style: [
      StyleSheet.absoluteFill,
      {
        borderRadius: compact
          ? tokens.media.radius.preview
          : tokens.media.radius.profile,
      },
    ],
    onDisplay: nativeImage.onDisplay,
    onError: nativeImage.onError,
  } satisfies ImageProps;
  return (
    <View
      style={[
        styles.thumbnail,
        compact && styles.compactThumbnail,
        { backgroundColor: colors.mediaPlaceholder },
      ]}
    >
      {image.uri && nativeImage.status !== "failed" ? (
        contentFit === "contain" ? (
          <RoundedContainedImage
            key={nativeImage.attemptKey}
            {...thumbnailProps}
          />
        ) : (
          <Image
            key={nativeImage.attemptKey}
            {...thumbnailProps}
            contentFit={contentFit}
          />
        )
      ) : (
        <ImageFallback
          label={`${image.uri ? "Image indisponible" : "Image absente"} : ${image.label}`}
          color={colors.icon}
        />
      )}
    </View>
  );
}

// UI Library Structure / Image Field, 230:489 (2026-10-22); standard 230:142, compact 2881:3071.
const styles = StyleSheet.create({
  field: { gap: tokens.layout.form.labelGap },
  disabled: { opacity: tokens.opacity.disabled },
  label: { ...tokens.typography.label, flexShrink: 1, textAlign: "center" },
  body: {
    minHeight: 168,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing["2xl"],
    gap: tokens.spacing.compact,
    alignItems: "center",
    borderWidth: tokens.border.thin,
    borderStyle: "dashed",
    borderRadius: tokens.radius.lg,
  },
  compact: {
    minHeight: 84,
    flexDirection: "row",
    // Override standard directional insets; the native border occupies Figma's inset stroke.
    paddingHorizontal: tokens.spacing.compact - tokens.border.thin,
    paddingVertical: tokens.spacing.compact - tokens.border.thin,
    gap: tokens.spacing.md,
  },
  thumbnail: {
    width: 92,
    height: 92,
    borderRadius: tokens.media.radius.profile,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  compactThumbnail: {
    width: 64,
    height: 64,
    borderRadius: tokens.media.radius.preview,
  },
  action: {
    minWidth: tokens.touch.minimum,
    minHeight: tokens.size.control.default,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    gap: tokens.spacing.xs,
  },
  remove: {
    minWidth: tokens.touch.minimum,
    minHeight: tokens.size.control.default,
    paddingVertical: tokens.spacing.sm,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  compactRemove: { alignSelf: "flex-end" },
  removeLabel: tokens.typography.strong,
} as const);
