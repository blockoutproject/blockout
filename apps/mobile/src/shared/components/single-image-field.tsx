import { Image } from "expo-image";
import { UserRound } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { ImageSelection } from "../images/use-image-selection";
import { useNativeImageLifecycle } from "../images/use-native-image-lifecycle";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { FieldMessage } from "./field-message";
import { ImagePreview, type ImageFieldImage } from "./image-field";
import { ImageFallback } from "./image-fallback";
import { useImageChoices } from "./image-choices";
import { LoadingIndicator } from "./loading-indicator";
import { TextSkeleton } from "./text-skeleton";

/**
 * A single image owns one preview and contextual choices. Known presence is independent from the
 * available URI; the feature alone supplies removal/restoration meaning, preparation and authorization.
 * Remote loading and decoding failure affect only the preview. Preparation uses the existing selection owner.
 */
export interface SingleImageFieldProps {
  label: string;
  image?: ImageFieldImage;
  /** A newly accepted read retries a previously failed native decode without remounting the field or its draft. */
  readRevision?: number;
  hasImage: boolean;
  selection: ImageSelection;
  /** Selects fallback glyph and copy; all artwork proportionally covers the shared rounded-square frame. */
  appearance?: "photo" | "logo";
  loading?: boolean;
  disabled?: boolean;
  addLabel?: string;
  editLabel?: string;
  chooseLabel?: string;
  removeLabel?: string;
  /** Requests a local draft intention; an unavailable preview never removes this supplied capability. */
  onRemove?: () => void;
  helper?: string;
  error?: string;
}

/** Shares the token-sized single-image entry, native choices and direct preview without owning an upload or draft. */
export function SingleImageField({
  label,
  image,
  readRevision,
  hasImage,
  selection,
  appearance = "logo",
  loading = false,
  disabled = false,
  addLabel = "Ajouter une image",
  editLabel = "Modifier l’image",
  chooseLabel = "Choisir une image",
  removeLabel = "Supprimer l’image",
  onRemove,
  helper,
  error,
}: SingleImageFieldProps) {
  const { colors } = useTheme();
  const [previewUri, setPreviewUri] = useState<string>();
  const unavailable = disabled || selection.pending;
  const nativeImage = useNativeImageLifecycle(image?.uri, readRevision);
  const visibleImage = nativeImage.status === "failed" ? undefined : image;

  const openChoices = useImageChoices({
    title: label,
    chooseLabel,
    removeLabel,
    disabled: unavailable,
    onChoose: () => {
      if (!disabled && !selection.isPending()) {
        selection.select(image?.id);
      }
    },
    onRemove: onRemove
      ? () => {
          if (!disabled && !selection.isPending()) {
            onRemove();
          }
        }
      : undefined,
  });

  // Source withdrawal closes this visit; a later read cannot reopen the viewer without another explicit press.
  if (
    previewUri &&
    (!visibleImage || visibleImage.uri !== previewUri || disabled)
  ) {
    setPreviewUri(undefined);
  }

  const mediaStyle = [
    styles.media,
    {
      backgroundColor: colors.mediaPlaceholder,
    },
  ];
  return (
    <View style={styles.field}>
      {visibleImage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Aperçu : ${visibleImage.label}`}
          accessibilityState={{ disabled: unavailable }}
          disabled={unavailable}
          onPress={() => setPreviewUri(visibleImage.uri)}
          style={mediaStyle}
        >
          <Image
            key={nativeImage.attemptKey}
            source={{ uri: visibleImage.uri }}
            accessible={false}
            cachePolicy="none"
            contentFit="cover"
            style={styles.image}
            onDisplay={nativeImage.onDisplay}
            onError={nativeImage.onError}
          />
        </Pressable>
      ) : (
        <View
          accessibilityRole={loading ? "progressbar" : "image"}
          accessibilityLabel={
            loading
              ? appearance === "photo"
                ? "Chargement de la photo"
                : "Chargement du logo"
              : hasImage
                ? `${label} indisponible`
                : appearance === "photo"
                  ? "Aucune photo de profil"
                  : "Aucun logo"
          }
          accessibilityState={{ busy: loading }}
          accessible
          style={mediaStyle}
        >
          {loading ? (
            <View
              accessible={false}
              style={[styles.image, { backgroundColor: colors.skeleton }]}
            />
          ) : appearance === "photo" ? (
            <UserRound
              accessible={false}
              size={tokens.size.control.compact}
              color={colors.secondaryText}
            />
          ) : (
            <ImageFallback
              size={tokens.size.control.compact}
              color={colors.secondaryText}
            />
          )}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasImage ? editLabel : addLabel}
        accessibilityHint={error ?? helper}
        accessibilityState={{ disabled: unavailable, busy: selection.pending }}
        disabled={unavailable}
        onPress={() => {
          if (!selection.isPending()) {
            openChoices();
          }
        }}
        style={({ pressed }) => [
          styles.entry,
          {
            opacity: unavailable
              ? tokens.opacity.disabled
              : pressed
                ? tokens.opacity.pressed
                : 1,
          },
        ]}
      >
        {selection.pending && <LoadingIndicator color={colors.icon} />}
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[styles.entryLabel, { color: colors.text }]}
        >
          {hasImage ? editLabel : addLabel}
        </Text>
      </Pressable>
      <FieldMessage error={error} />
      <Modal
        visible={!!visibleImage && previewUri === visibleImage.uri && !disabled}
        presentationStyle="fullScreen"
        animationType="none"
        onRequestClose={() => setPreviewUri(undefined)}
      >
        {visibleImage && previewUri === visibleImage.uri && !disabled && (
          <SafeAreaProvider>
            <ImagePreview
              key={`${visibleImage.id}:${visibleImage.uri}`}
              image={visibleImage}
              onClose={() => setPreviewUri(undefined)}
            />
          </SafeAreaProvider>
        )}
      </Modal>
    </View>
  );
}

/** Reserves the shared rounded-square preview and entry without controls or a second pending announcement. */
export function SingleImageFieldSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={styles.field}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.media,
          {
            backgroundColor: colors.skeleton,
          },
        ]}
      />
      <View style={styles.entry}>
        <TextSkeleton role="body" width={2 * tokens.size.media.profile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
  },
  media: {
    width: tokens.size.media.profile + 2 * tokens.spacing.sm,
    height: tokens.size.media.profile + 2 * tokens.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.panelInset,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  entry: {
    minHeight: tokens.size.control.default,
    minWidth: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
  },
  entryLabel: tokens.typography.strong,
});
