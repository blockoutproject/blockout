import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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
 * The caller retains values until it accepts selection/removal. `onSelect` receives original
 * picker assets and the replaced identity (absent for additions). It owns preparation with
 * Expo ImageManipulator when needed, actual PNG/JPEG validation and the 5 MiB upload bound
 * after preparation; picker metadata alone is not content validation. Only the profile owner
 * prepares squares. Sporting owners decide removal/restoration; F10 owns private files.
 * Owners invalidate session-specific callbacks and unmount/key this field when its owner changes.
 * `selectionLimit` is the caller's remaining native selection capacity (positive when multiple).
 * Errors supplied by the caller are safe French messages; thrown native/preparation errors are hidden.
 */
export interface ImageFieldProps {
  label: string;
  images: readonly ImageFieldImage[];
  onSelect: (
    assets: ImagePicker.ImagePickerAsset[],
    replaceId?: string,
  ) => void | Promise<void>;
  onRemove: (id: string) => void;
  multiple?: boolean;
  selectionLimit?: number;
  disabled?: boolean;
  size?: "standard" | "compact";
  chooseLabel?: string;
  replaceLabel?: string;
  removeLabel?: string;
  helper?: string;
  error?: string;
}

/** Uses the system image library and a full-screen preview while leaving every accepted value with its owner. */
export function ImageField({
  label,
  images,
  onSelect,
  onRemove,
  multiple = false,
  selectionLimit = 1,
  disabled = false,
  size = "standard",
  chooseLabel = "Choisir une image",
  replaceLabel = "Changer l’image",
  removeLabel = "Supprimer l’image",
  helper,
  error,
}: ImageFieldProps) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [selectionError, setSelectionError] = useState<string>();
  const [previewId, setPreviewId] = useState<string>();
  const active = useRef(true);
  const selecting = useRef(false);
  const preview = images.find((image) => image.id === previewId);
  const message = error ?? selectionError;
  const unavailable = disabled || busy;
  const compact = size === "compact";

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  /** Cancelling preserves values; native failures never disclose paths or provider diagnostics. */
  async function select(replaceId?: string) {
    if (disabled || selecting.current) return;
    selecting.current = true;
    setBusy(true);
    setSelectionError(undefined);
    try {
      // SDK 57's image-only system library requires no broad photo permission request.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: multiple && replaceId === undefined,
        selectionLimit:
          replaceId === undefined && multiple ? selectionLimit : 1,
      });
      if (active.current && !result.canceled)
        await onSelect(result.assets, replaceId);
    } catch {
      if (active.current)
        setSelectionError("Impossible de sélectionner l’image. Réessayez.");
    } finally {
      selecting.current = false;
      if (active.current) setBusy(false);
    }
  }

  return (
    <View style={[styles.field, disabled && styles.disabled]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
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
              onPress={() => setPreviewId(image.id)}
            >
              <Image
                source={{ uri: image.uri }}
                accessible={false}
                cachePolicy="none"
                contentFit="cover"
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${removeLabel} : ${image.label}`}
            accessibilityState={{ disabled: unavailable }}
            disabled={unavailable}
            onPress={() => onRemove(image.id)}
            style={styles.remove}
          >
            <Text style={[styles.removeLabel, { color: colors.secondaryText }]}>
              {removeLabel}
            </Text>
          </Pressable>
        </View>
      ))}
      {(images.length === 0 || multiple) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={busy ? "Chargement…" : chooseLabel}
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
            ) : (
              <Image
                source={
                  message
                    ? require("../../../assets/icons/image-off.svg")
                    : require("../../../assets/icons/image.svg")
                }
                accessible={false}
                tintColor={colors.icon}
                contentFit="contain"
                style={styles.icon}
              />
            )}
          </View>
          <Text style={[styles.label, { color: colors.text }]}>
            {busy ? "Chargement…" : chooseLabel}
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
          <SafeAreaView
            style={[styles.viewer, { backgroundColor: colors.canvas }]}
            accessibilityViewIsModal
          >
            <IconButton
              label="Fermer l’aperçu"
              onPress={() => setPreviewId(undefined)}
            >
              <Image
                source={require("../../../assets/icons/close.svg")}
                tintColor={colors.icon}
                style={styles.icon}
              />
            </IconButton>
            <Image
              source={{ uri: preview.uri }}
              accessibilityRole="image"
              accessibilityLabel={preview.label}
              accessible
              cachePolicy="none"
              contentFit="contain"
              style={styles.fullImage}
            />
          </SafeAreaView>
        )}
      </Modal>
    </View>
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
  icon: { width: tokens.size.actionIcon, height: tokens.size.actionIcon },
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
  removeLabel: tokens.typography.strong,
  viewer: { flex: 1 },
  fullImage: { flex: 1, width: "100%" },
});
