import { RoundedContainedImage } from "../../../shared/components/rounded-contained-image";
import { BlurredArtwork } from "../../../shared/components/blurred-artwork";
import { ImageFallback } from "../../../shared/components/image-fallback";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { SportingIdentityResponse } from "../../../../.generated/schemas/index.zod";
import { Skeleton } from "../../../shared/components/skeleton";
import { useNativeImageLifecycle } from "../../../shared/images/use-native-image-lifecycle";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { mediaRadius } from "../../../shared/theme/media-radius";

/** Optional sports artwork keeps its fixed slot and native lifecycle; absent or failed artwork uses the nominal fallback. */
export interface SportingMediaProps {
  identity: Pick<SportingIdentityResponse, "name" | "shortName">;
  uri?: string;
  loading?: boolean;
  /** Failure uses the nominal fallback; only its accessible alternative distinguishes absence. */
  error?: boolean;
  kind: "club" | "team" | "division";
  /** The owning composition sizes the slot; Media/Logo and Entity Card retain their approved shapes. */
  size?: number;
  presentation?: "logo" | "entity";
  /** The owner places both layers; a decoding failure removes the foreground and atmosphere together. */
  renderWithAtmosphere?: (logo: ReactNode, atmosphere: ReactNode) => ReactNode;
}

/** Keeps native media beneath its skeleton without remounting the caller's card; either layer's error withdraws both. */
export function SportingMedia({
  identity,
  uri,
  loading = false,
  error = false,
  kind,
  size = tokens.size.media.row,
  presentation = "logo",
  renderWithAtmosphere,
}: Readonly<SportingMediaProps>) {
  /** Keeps the native image, loading skeleton and absent-artwork fallback in the same media slot. */
  function renderArtwork() {
    if (available) {
      return (
        <RoundedContainedImage
          key={image.attemptKey}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${label} : ${identity.name}`}
          accessibilityState={{ busy: pending }}
          source={{ uri }}
          cachePolicy="none"
          recyclingKey={uri}
          onDisplay={image.onDisplay}
          onError={image.onError}
          style={{
            width: imageSize,
            height: imageSize,
            borderRadius: mediaRadius(imageSize),
            overflow: "hidden",
          }}
        />
      );
    }
    if (loading) {
      return (
        <Skeleton
          width={size}
          height={size}
          shape="rectangle"
          radius={borderRadius}
        />
      );
    }
    return (
      <ImageFallback
        color={colors.logoInk}
        size={
          presentation !== "logo" ? tokens.size.icon.lg : tokens.size.icon.md
        }
      />
    );
  }

  const { colors } = useTheme();
  const image = useNativeImageLifecycle(uri);
  const failed = image.status === "failed";
  const available = !!uri && !failed;
  const pending = available && image.status === "pending";
  const label = available
    ? "Logo"
    : loading
      ? "Chargement du logo"
      : error || failed
        ? "Logo indisponible"
        : "Logo absent";
  const imageSize = kind === "division" ? size : size * (5 / 6);
  const borderRadius = mediaRadius(size);
  const logo = (
    <View
      style={[
        styles.media,
        { width: size },
        { borderRadius, backgroundColor: colors.logoSurface },
      ]}
    >
      <View
        accessible={!available}
        accessibilityRole={available ? undefined : "image"}
        accessibilityLabel={
          available ? undefined : `${label} : ${identity.name}`
        }
        accessibilityState={{ busy: loading && !available }}
        style={[
          styles.slot,
          {
            width: size,
            height: size,
            backgroundColor: colors.logoSurface,
            borderRadius,
          },
        ]}
      >
        {renderArtwork()}
        {pending && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Skeleton
              width={size}
              height={size}
              shape="rectangle"
              radius={borderRadius}
            />
          </View>
        )}
      </View>
    </View>
  );
  if (!renderWithAtmosphere) {
    return logo;
  }
  const atmosphere = available ? (
    <BlurredArtwork
      key={image.attemptKey}
      testID="sporting-logo-atmosphere"
      uri={uri}
      resizeMode="contain"
      blurRadius={tokens.sporting.coverBlur}
      onError={image.onError}
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: tokens.sporting.standingsCard.atmosphereOpacity,
        },
      ]}
    />
  ) : null;
  return renderWithAtmosphere(logo, atmosphere);
}

/** Decorative cover inputs preserve the current source and its accepted tint without introducing fallback artwork. */
export interface SportingCoverProps {
  uri: string;
  primary: string;
}

/** Decorative cover and its tint disappear together after native decoding fails; no fallback artwork is invented. */
export function SportingCover({ uri, primary }: Readonly<SportingCoverProps>) {
  const [failedUri, setFailedUri] = useState<string>();
  return failedUri === uri ? null : (
    <View pointerEvents="none" accessible={false} style={styles.artwork}>
      <BlurredArtwork
        testID="sporting-decorative-cover"
        uri={uri}
        resizeMode="contain"
        blurRadius={tokens.sporting.coverBlur}
        onError={() => setFailedUri(uri)}
        style={styles.cover}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: primary,
            opacity: tokens.sporting.coverVeilOpacity,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cover: {
    width: tokens.sporting.coverSize,
    aspectRatio: 1,
    opacity: tokens.sporting.coverOpacity,
  },
  media: {
    alignItems: "center",
    flexShrink: 1,
    maxWidth: "100%",
    overflow: "hidden",
  },
  slot: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
