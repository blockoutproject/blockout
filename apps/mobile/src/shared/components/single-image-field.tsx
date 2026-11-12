import { controlOpacity } from "./control-styles";
import { Image } from "expo-image";
import { UserRound } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ImageSelection } from "../images/use-image-selection";
import { useNativeImageLifecycle } from "../images/use-native-image-lifecycle";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { FieldMessage } from "./field-message";
import type { ImageFieldImage } from "./image-field";
import { ImageFallback } from "./image-fallback";
import { useImageChoices } from "./image-choices";
import { LoadingIndicator } from "./loading-indicator";
import { TextSkeleton } from "./text-skeleton";

/**
 * A single passive image owns contextual editing choices. Known presence is independent from the
 * available URI; the feature alone supplies removal/restoration meaning, preparation and authorization.
 * Remote loading and decoding failure affect only the displayed image. Preparation uses the existing selection owner.
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
  /** Requests a local draft intention; an unavailable image never removes this supplied capability. */
  onRemove?: () => void;
  helper?: string;
  error?: string;
}

/** Shares the token-sized single-image entry, native choices and passive image without owning an upload or draft. */
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
}: Readonly<SingleImageFieldProps>) {
  const { colors } = useTheme();
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

  const mediaStyle = [
    styles.media,
    {
      backgroundColor: colors.mediaPlaceholder,
    },
  ];
  return (
    <View style={styles.field}>
      {visibleImage ? (
        <View style={mediaStyle}>
          <Image
            key={nativeImage.attemptKey}
            source={{ uri: visibleImage.uri }}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Miniature : ${visibleImage.label}`}
            cachePolicy="none"
            contentFit="cover"
            style={styles.image}
            onDisplay={nativeImage.onDisplay}
            onError={nativeImage.onError}
          />
        </View>
      ) : (
        <SingleImagePlaceholder
          label={label}
          appearance={appearance}
          loading={loading}
          hasImage={hasImage}
        />
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
            opacity: controlOpacity(unavailable, pressed),
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
    </View>
  );
}

/** Keeps missing, withdrawn and loading media distinct without owning selection. */
function SingleImagePlaceholder({
  label,
  appearance,
  loading,
  hasImage,
}: Readonly<
  Pick<SingleImageFieldProps, "label" | "appearance" | "loading" | "hasImage">
>) {
  const { colors } = useTheme();
  let accessibilityLabel =
    appearance === "photo" ? "Aucune photo de profil" : "Aucun logo";
  if (loading) {
    accessibilityLabel =
      appearance === "photo" ? "Chargement de la photo" : "Chargement du logo";
  } else if (hasImage) {
    accessibilityLabel = `${label} indisponible`;
  }
  let content = (
    <ImageFallback
      size={tokens.size.control.compact}
      color={colors.secondaryText}
    />
  );
  if (loading) {
    content = (
      <View
        accessible={false}
        style={[styles.image, { backgroundColor: colors.skeleton }]}
      />
    );
  } else if (appearance === "photo") {
    content = (
      <UserRound
        accessible={false}
        size={tokens.size.control.compact}
        color={colors.secondaryText}
      />
    );
  }
  return (
    <View
      accessibilityRole={loading ? "progressbar" : "image"}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: loading }}
      accessible
      style={[styles.media, { backgroundColor: colors.mediaPlaceholder }]}
    >
      {content}
    </View>
  );
}

/** Reserves the shared rounded-square image and entry without controls or a second pending announcement. */
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
    borderRadius: tokens.media.radius.profile,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: tokens.media.radius.profile,
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
