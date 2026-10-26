import { Image } from "expo-image";
import type { ImageSelection } from "../images/use-image-selection";
import {
  Image as ImageIcon,
  ImageOff,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { IconButton } from "./icon-button";
import { LoadingIndicator } from "./loading-indicator";

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
  size?: "standard" | "compact";
  chooseLabel?: string;
  retryLabel?: string;
  /** Thumbnail fitting only; use contain for logos. This does not transform selected assets or full previews. */
  contentFit?: "cover" | "contain";
  replaceLabel?: string;
  removeLabel?: string;
  helper?: string;
  error?: string;
  /** Owner-selected Lucide empty-state glyph; error and selection/preview behavior stay shared. */
  placeholderIcon?: LucideIcon;
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
  retryLabel = "Réessayer",
  contentFit = "cover",
  replaceLabel = "Changer l’image",
  removeLabel = "Supprimer l’image",
  helper,
  error,
  placeholderIcon: PlaceholderIcon = ImageIcon,
}: ImageFieldProps) {
  const { colors } = useTheme();
  const [previewId, setPreviewId] = useState<string>();
  const preview = images.find((image) => image.id === previewId);
  const busy = selection.pending;
  const message = error;
  const unavailable = disabled || busy;
  const compact = size === "compact";
  let selectionLabel = chooseLabel;
  if (busy) selectionLabel = "Chargement…";
  else if (message) selectionLabel = retryLabel;

  return (
    <View style={[styles.field, disabled && styles.disabled]}>
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
                borderColor: message ? colors.error : colors.border,
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
              accessibilityLabel={
                busy ? "Chargement…" : `${replaceLabel} : ${image.label}`
              }
              accessibilityHint={message ?? helper}
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
                {busy ? "Chargement…" : replaceLabel}
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
          accessibilityLabel={selectionLabel}
          accessibilityHint={message ?? helper}
          accessibilityState={{ disabled: unavailable, busy }}
          disabled={unavailable}
          onPress={() => selection.select()}
          style={({ pressed }) => [
            styles.body,
            compact && styles.compact,
            {
              backgroundColor: colors.surface,
              borderColor: message ? colors.error : colors.border,
              opacity: pressed ? tokens.opacity.pressed : 1,
            },
          ]}
        >
          <View
            style={[
              styles.thumbnail,
              compact && styles.compactThumbnail,
              {
                backgroundColor: message
                  ? colors.subtle
                  : colors.mediaPlaceholder,
              },
            ]}
          >
            {busy ? (
              <LoadingIndicator color={colors.icon} />
            ) : message ? (
              <ImageOff
                accessible={false}
                size={tokens.size.actionIcon}
                color={colors.icon}
              />
            ) : (
              <PlaceholderIcon
                accessible={false}
                size={tokens.size.actionIcon}
                color={colors.icon}
              />
            )}
          </View>
          <Text style={[styles.label, { color: colors.text }]}>
            {selectionLabel}
          </Text>
        </Pressable>
      )}
      {message ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.message, { color: colors.error }]}
        >
          {message}
        </Text>
      ) : helper ? (
        <Text style={[styles.message, { color: colors.secondaryText }]}>
          {helper}
        </Text>
      ) : null}
      <Modal
        visible={!!preview}
        presentationStyle="fullScreen"
        animationType="none"
        onRequestClose={() => setPreviewId(undefined)}
      >
        {preview && (
          <ImagePreview
            key={`${preview.id}:${preview.uri}`}
            image={preview}
            onClose={() => setPreviewId(undefined)}
          />
        )}
      </Modal>
    </View>
  );
}

/** One mounted image attempt owns decode feedback; changing the image or closing the viewer drops it. */
function ImagePreview({
  image,
  onClose,
}: {
  image: ImageFieldImage;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <SafeAreaView
      style={[styles.viewer, { backgroundColor: colors.canvas }]}
      accessibilityViewIsModal
    >
      <IconButton label="Fermer l’aperçu" onPress={onClose}>
        <X
          accessible={false}
          size={tokens.size.actionIcon}
          color={colors.icon}
        />
      </IconButton>
      {failed && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.previewError, { color: colors.error }]}
        >
          Impossible d’afficher l’image.
        </Text>
      )}
      <Image
        onError={() => setFailed(true)}
        source={{ uri: image.uri }}
        accessibilityRole="image"
        accessibilityLabel={image.label}
        accessible
        cachePolicy="none"
        contentFit="contain"
        style={styles.fullImage}
      />
    </SafeAreaView>
  );
}

// UI Library Structure / Image Field, 230:489 (2026-10-22); standard 230:142, compact 2881:3071.
const styles = StyleSheet.create({
  field: { gap: tokens.spacing.label },
  disabled: { opacity: tokens.opacity.disabled },
  label: { ...tokens.typography.label, flexShrink: 1, textAlign: "center" },
  message: tokens.typography.body,
  body: {
    minHeight: 168,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.section,
    gap: tokens.spacing.compact,
    alignItems: "center",
    borderWidth: tokens.borderWidth,
    borderStyle: "dashed",
    borderRadius: tokens.radius.media,
  },
  compact: {
    minHeight: 84,
    flexDirection: "row",
    padding: tokens.spacing.compact,
    gap: tokens.spacing.md,
  },
  thumbnail: {
    width: 92,
    height: 92,
    borderRadius: tokens.radius.media,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  compactThumbnail: { width: 64, height: 64 },
  action: {
    minWidth: tokens.touchTarget.ios,
    minHeight: tokens.size.control,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    gap: tokens.spacing.xs,
  },
  remove: {
    minWidth: tokens.touchTarget.ios,
    minHeight: tokens.size.control,
    paddingVertical: tokens.spacing.sm,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  compactRemove: { alignSelf: "flex-end" },
  removeLabel: tokens.typography.strong,
  previewError: { ...tokens.typography.body, margin: tokens.spacing.lg },
  viewer: { flex: 1 },
  fullImage: { flex: 1, width: "100%" },
} as const);
