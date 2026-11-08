import { Image } from "expo-image";
import { UserRound } from "lucide-react-native";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { ImageSelection } from "../images/use-image-selection";
import { useNativeImageLifecycle } from "../images/use-native-image-lifecycle";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { FieldMessage } from "./field-message";
import { ImagePreview, type ImageFieldImage } from "./image-field";
import { ImageFallback } from "./image-fallback";
import { useImageChoices, type ImageChoiceRequest } from "./image-choices";
import { LoadingIndicator } from "./loading-indicator";
import { Skeleton } from "./skeleton";
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
  const choices = useImageChoices();
  const [owner] = useState(() => ({}));
  const latest = useRef({ disabled, selection, image, onRemove });
  useLayoutEffect(() => {
    latest.current = { disabled, selection, image, onRemove };
  }, [disabled, selection, image, onRemove]);
  const choosing = useRef(false);
  const [previewUri, setPreviewUri] = useState<string>();
  const unavailable = disabled || selection.pending;
  const nativeImage = useNativeImageLifecycle(image?.uri, readRevision);
  const visibleImage = nativeImage.status === "failed" ? undefined : image;

  const actions = useMemo(() => {
    /** The existing picker remains above its native sheet until selection/preparation has settled. */
    function choose() {
      const current = latest.current;
      if (current.disabled || current.selection.isPending()) {
        return;
      }
      current.selection.select(current.image?.id);
      if (current.selection.isPending()) {
        choosing.current = true;
      }
    }

    /** Current authority and selection ownership are rechecked before changing the caller's local draft. */
    function remove() {
      const current = latest.current;
      if (current.disabled || current.selection.isPending()) {
        return;
      }
      current.onRemove?.();
      choices.dismiss(owner);
    }

    return { choose, remove };
  }, [choices, owner]);
  const request = useMemo<ImageChoiceRequest>(
    () => ({
      owner,
      title: label,
      chooseLabel,
      removeLabel,
      helper,
      disabled: unavailable,
      pending: selection.pending,
      onChoose: actions.choose,
      onRemove: onRemove ? actions.remove : undefined,
    }),
    [
      owner,
      label,
      chooseLabel,
      removeLabel,
      helper,
      unavailable,
      selection.pending,
      actions,
      onRemove,
    ],
  );
  useEffect(() => {
    choices.update(request);
  }, [choices, request]);
  useEffect(
    () => () => {
      choices.release(owner);
    },
    [choices, owner],
  );
  useEffect(() => {
    if (choosing.current && !selection.pending) {
      choosing.current = false;
      choices.dismiss(owner);
    }
  }, [choices, owner, selection.pending]);

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
      borderRadius:
        appearance === "photo" ? tokens.radius.full : tokens.radius.panelInset,
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
            contentFit={appearance === "photo" ? "cover" : "contain"}
            style={[
              styles.image,
              {
                borderRadius:
                  appearance === "photo"
                    ? tokens.radius.full
                    : tokens.radius.media,
              },
            ]}
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
            <Skeleton
              shape="rectangle"
              width={tokens.size.media.profile}
              height={tokens.size.media.profile}
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
        onPress={() => choices.open(request)}
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

/** Reserves the shared preview and entry without controls or a second pending announcement. */
export function SingleImageFieldSkeleton({
  appearance = "logo",
}: {
  appearance?: SingleImageFieldProps["appearance"];
}) {
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
            borderRadius:
              appearance === "photo"
                ? tokens.radius.full
                : tokens.radius.panelInset,
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
    padding: tokens.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: tokens.size.media.profile,
    height: tokens.size.media.profile,
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
