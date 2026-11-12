import { Image } from "expo-image";
import type { ImageSelection } from "../images/use-image-selection";
import { X } from "lucide-react-native";
import { ImageFallback } from "./image-fallback";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { IconButton } from "./icon-button";
import { LoadingIndicator } from "./loading-indicator";
import { FieldMessage } from "./field-message";
import { ScreenState } from "./screen-state";
import { ErrorState } from "./state-card";
import { Page, PageScrollView } from "./page";
import { BottomContentSpacer } from "./bottom-content-inset";
import { useNativeImageLifecycle } from "../images/use-native-image-lifecycle";
import { LoadingGroup } from "./loading-group";
import { Skeleton } from "./skeleton";

/** Stable caller identity and accessible description for an existing or prepared local preview. */
export interface ImageFieldImage {
  id: string;
  uri: string;
  label: string;
}

/**
 * Controlled preview and actions; `selection` is the caller-owned native picker/preparation lifecycle.
 * The caller retains accepted values and supplies safe French validation messages. The shared owner
 * hides native diagnostics; feature owners validate bytes and decide removal/restoration semantics.
 * `multiple` only exposes the add action beside existing images; configure the same policy on the owner.
 */
export interface ImageFieldProps {
  /** Optional visible heading; action labels retain their accessible names. */
  label?: string;
  images: readonly ImageFieldImage[];
  selection: ImageSelection;
  /** Omit when the current image permits preview/replacement but no removal. */
  onRemove?: (id: string) => void;
  multiple?: boolean;
  disabled?: boolean;
  /** Uses the published standard or compact preview/action composition. */
  size?: "standard" | "compact";
  chooseLabel?: string;
  /** Thumbnail fitting only; use contain for logos. This does not transform selected assets or full previews. */
  contentFit?: "cover" | "contain";
  replaceLabel?: string;
  removeLabel?: string;
  helper?: string;
  error?: string;
}

/** Renders the caller-owned selection lifecycle and a local full-screen preview. */
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
  const [previewId, setPreviewId] = useState<string>();
  const preview = images.find((image) => image.id === previewId);
  const busy = selection.pending;
  const unavailable = disabled || busy;
  const compact = size === "compact";

  return (
    <View
      // Keep preview and action parentage stable as the disabled opacity ends during a native save transition.
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Aperçu : ${image.label}`}
              disabled={unavailable}
              accessibilityState={{ disabled: unavailable }}
              onPress={() => {
                setPreviewId(image.id);
              }}
              style={({ pressed }) => ({
                opacity: pressed ? tokens.opacity.pressed : 1,
              })}
            >
              <Image
                source={{ uri: image.uri }}
                accessible={false}
                cachePolicy="none"
                contentFit={contentFit}
                style={[
                  styles.thumbnail,
                  compact && styles.compactThumbnail,
                  { backgroundColor: colors.mediaPlaceholder },
                ]}
              />
            </Pressable>
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
      <Modal
        visible={!!preview}
        presentationStyle="fullScreen"
        animationType="none"
        onRequestClose={() => setPreviewId(undefined)}
      >
        {preview && (
          // A native Modal has its own view root; measure its insets inside that root.
          <SafeAreaProvider>
            <ImagePreview
              key={`${preview.id}:${preview.uri}`}
              image={preview}
              onClose={() => setPreviewId(undefined)}
            />
          </SafeAreaProvider>
        )}
      </Modal>
    </View>
  );
}

/** Keeps the caller's image and draft intact; native decoding owns pending/success/failure and Retry retains its card. */
export function ImagePreview({
  image,
  onClose,
}: Readonly<{
  image: ImageFieldImage;
  onClose: () => void;
}>) {
  const { colors } = useTheme();
  const [attempt, setAttempt] = useState(0);
  const nativeImage = useNativeImageLifecycle(image.uri, attempt);
  const retrying = attempt > 0 && nativeImage.status === "pending";
  const showError = nativeImage.status === "failed" || retrying;
  return (
    <Page accessibilityViewIsModal>
      <IconButton label="Fermer" onPress={onClose}>
        <X accessible={false} size={tokens.size.icon.lg} color={colors.icon} />
      </IconButton>
      <View style={styles.previewBody}>
        {nativeImage.status !== "failed" && (
          <Image
            key={nativeImage.attemptKey}
            onError={nativeImage.onError}
            onDisplay={nativeImage.onDisplay}
            source={{ uri: image.uri }}
            accessibilityRole="image"
            accessibilityLabel={image.label}
            accessible
            cachePolicy="none"
            contentFit="contain"
            style={[
              styles.fullImage,
              nativeImage.status !== "displayed" && styles.pendingImage,
            ]}
            accessibilityElementsHidden={nativeImage.status !== "displayed"}
            importantForAccessibility={
              nativeImage.status !== "displayed"
                ? "no-hide-descendants"
                : "auto"
            }
          />
        )}
        {showError ? (
          <PageScrollView>
            <ScreenState>
              <ErrorState
                onRetry={() => setAttempt((value) => value + 1)}
                retrying={retrying}
              />
            </ScreenState>
          </PageScrollView>
        ) : (
          nativeImage.status === "pending" && (
            <LoadingGroup
              label="Chargement de l’image"
              style={styles.previewLoading}
            >
              <Skeleton height="100%" shape="rectangle" />
            </LoadingGroup>
          )
        )}
      </View>
      {!showError && <BottomContentSpacer />}
    </Page>
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
    borderRadius: tokens.media.radius.preview,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  compactThumbnail: { width: 64, height: 64 },
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
  previewBody: { flex: 1 },
  previewLoading: { flex: 1, padding: tokens.spacing.screen },
  fullImage: StyleSheet.absoluteFill,
  pendingImage: { opacity: 0 },
} as const);
