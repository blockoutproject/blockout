import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  Image as ImageIcon,
  ImageOff,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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
 * Controlled image interaction, without upload, persistence or business validation.
 * The caller retains values until it accepts selection/removal. `onSelect` receives native
 * picker assets, including any requested native crop, and the replaced identity (absent for additions).
 * The owning feature uses Expo ImageManipulator for native preparation when needed, checks the 5 MiB upload bound
 * after preparation, and validates actual PNG/JPEG content on the server; picker metadata is not content validation.
 * Only the profile owner
 * prepares squares. Sporting owners decide removal/restoration; F10 owns private files.
 * Owners invalidate session-specific callbacks and unmount/key this field when its owner changes.
 * `selectionLimit` is the caller's remaining native selection capacity (positive when multiple).
 * Errors supplied by the caller are safe French messages; thrown native/preparation errors are hidden.
 */
export interface ImageFieldProps {
  /** Optional visible heading; action labels retain their accessible names. */
  label?: string;
  images: readonly ImageFieldImage[];
  onSelect: (
    assets: ImagePicker.ImagePickerAsset[],
    replaceId?: string,
  ) => void | Promise<void>;
  /** Omit when the current image permits preview/replacement but no removal. */
  onRemove?: (id: string) => void;
  multiple?: boolean;
  selectionLimit?: number;
  /** Opts into the system crop UI; defaults off. Multiple additions disable editing; single replacements can use it. */
  allowsEditing?: boolean;
  /** Native Android crop ratio when editing; iOS always crops to a square. */
  aspect?: ImagePicker.ImagePickerOptions["aspect"];
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

/** Uses the system image library and a full-screen preview while leaving every accepted value with its owner. */
export function ImageField({
  label,
  images,
  onSelect,
  onRemove,
  multiple = false,
  selectionLimit = 1,
  allowsEditing = false,
  aspect,
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
  const [selection, setSelection] = useState<"idle" | "pending" | "failed">(
    "idle",
  );
  const [previewId, setPreviewId] = useState<string>();
  const active = useRef(true);
  const preview = images.find((image) => image.id === previewId);
  const busy = selection === "pending";
  const message =
    error ??
    (selection === "failed"
      ? "Impossible de sélectionner l’image. Réessayez."
      : undefined);
  const unavailable = disabled || busy;
  const compact = size === "compact";
  let selectionLabel = chooseLabel;
  if (busy) selectionLabel = "Chargement…";
  else if (message) selectionLabel = retryLabel;

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  /** Cancelling preserves values; native failures never disclose paths or provider diagnostics. */
  async function select(replaceId?: string) {
    if (unavailable) return;
    setSelection("pending");
    try {
      const allowsMultipleSelection = multiple && replaceId === undefined;
      // The SDK's image-only system library requires no broad photo permission request.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: allowsEditing && !allowsMultipleSelection,
        aspect,
        allowsMultipleSelection,
        selectionLimit: allowsMultipleSelection ? selectionLimit : 1,
      });
      if (active.current && !result.canceled)
        await onSelect(result.assets, replaceId);
      if (active.current) setSelection("idle");
    } catch {
      if (active.current) setSelection("failed");
    }
  }

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
              onPress={() => void select(image.id)}
              style={styles.action}
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
              style={[styles.remove, compact && styles.compactRemove]}
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
          onPress={() => void select()}
          style={[
            styles.body,
            compact && styles.compact,
            {
              backgroundColor: colors.surface,
              borderColor: message ? colors.error : colors.border,
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
