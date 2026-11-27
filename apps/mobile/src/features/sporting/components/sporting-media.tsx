import { Image } from "expo-image";
import {
  ArtworkHalo,
  type ArtworkHaloTreatment,
} from "@/shared/components/artwork-halo";
import {
  artworkOpacityTransition,
  BlurredArtwork,
} from "@/shared/components/blurred-artwork";
import { ImageFallback } from "@/shared/components/image-fallback";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import type { SportingIdentityResponse } from "../../../../.generated/schemas/index.zod";
import { useNativeImageLifecycle } from "@/shared/images/use-native-image-lifecycle";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { mediaRadius } from "@/shared/theme/media-radius";

/** Optional sports artwork keeps its fixed slot and native lifecycle; absent or failed artwork uses the nominal fallback. */
export interface SportingMediaProps {
  identity: Pick<SportingIdentityResponse, "name">;
  uri?: string;
  loading?: boolean;
  /** Failure uses the nominal fallback; only its accessible alternative distinguishes absence. */
  error?: boolean;
  kind: "club" | "team" | "division";
  /** The owning composition sizes the slot; Media/Logo and Entity Card retain their approved shapes. */
  size?: number;
  /** Keep Expo Image's bounds fixed when the same artwork slot is visually resized. */
  nativeSize?: number;
  presentation?: "logo" | "entity" | "identity";
  /** Non-card presentations can retain their active media skeleton. */
  pendingPlaceholder?: "fallback" | "skeleton";
  /** The owner places both layers. A failed sharp source withdraws its decoration as well. */
  renderWithAtmosphere?: (logo: ReactNode, atmosphere: ReactNode) => ReactNode;
  /** False keeps the foreground composition mounted with no decorative image. */
  atmosphere?:
    | false
    | Readonly<{
        treatment?: ArtworkHaloTreatment;
        testID?: string;
        /** Standings retain their paired fallback if either native image fails. */
        withdrawLogoOnError?: boolean;
      }>;
}

/** Keeps the readable plate in place until the native foreground has drawn. */
export function SportingMedia({
  identity,
  uri,
  loading = false,
  error = false,
  kind,
  size = tokens.size.media.row,
  nativeSize,
  presentation = "logo",
  pendingPlaceholder = "fallback",
  renderWithAtmosphere,
  atmosphere,
}: Readonly<SportingMediaProps>) {
  /** Expo Image reloads when its bounds change. Resize the display with the wrapping view. */
  function renderArtwork() {
    const fixedSize = nativeSize !== undefined;
    const radius = artworkScale < 1 ? mediaRadius(size * artworkScale) : 0;
    const artwork = (
      <Image
        key={image.attemptKey}
        accessible={false}
        testID="sporting-logo-image"
        source={{ uri }}
        cachePolicy="none"
        contentFit="contain"
        onDisplay={image.onDisplay}
        onError={image.onError}
        style={{
          width: nativeImageSize,
          height: nativeImageSize,
          borderRadius: fixedSize ? undefined : radius,
          overflow: fixedSize ? undefined : "hidden",
        }}
      />
    );
    if (!fixedSize) {
      return artwork;
    }
    const scale = size / nativeSize;
    return (
      <View
        style={{
          width: nativeImageSize,
          height: nativeImageSize,
          borderRadius: radius / scale,
          overflow: "hidden",
          transform: [{ scale }],
        }}
      >
        {artwork}
      </View>
    );
  }

  const { colors } = useTheme();
  const image = useNativeImageLifecycle(uri);
  const failed = image.status === "failed";
  const available = !!uri && !failed;
  const displayed = available && image.status === "displayed";
  const busy = available ? !displayed : loading;
  const identityPlate = presentation === "identity";
  const label = available
    ? identityPlate && error
      ? "Logo non actualisé"
      : "Logo"
    : loading
      ? "Chargement du logo"
      : error || failed
        ? "Logo indisponible"
        : "Logo absent";
  const artworkScale = kind === "division" || identityPlate ? 1 : 5 / 6;
  const nativeImageSize = (nativeSize ?? size) * artworkScale;
  const showSkeleton = busy && pendingPlaceholder === "skeleton";
  // Updating the slot's accessibility state keeps Expo Image's native props stable after display.
  const logo = (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${label} : ${identity.name}`}
      accessibilityState={{ busy }}
      style={[
        styles.slot,
        {
          width: size,
          height: size,
          // IdentityCard already clips its artwork slot.
          borderRadius: identityPlate ? undefined : mediaRadius(size),
          backgroundColor: colors.logoSurface,
        },
      ]}
    >
      {available && renderArtwork()}
      {!displayed && (
        <View
          pointerEvents="none"
          testID={showSkeleton ? undefined : "sporting-logo-fallback"}
          style={[
            StyleSheet.absoluteFill,
            styles.fallback,
            {
              backgroundColor: showSkeleton
                ? colors.skeleton
                : colors.logoSurface,
            },
          ]}
        >
          {!showSkeleton && (
            <ImageFallback
              color={colors.logoInk}
              size={
                presentation === "logo"
                  ? tokens.size.icon.md
                  : tokens.size.icon.lg
              }
            />
          )}
        </View>
      )}
    </View>
  );
  if (!renderWithAtmosphere) {
    return logo;
  }
  const halo =
    available && atmosphere !== false ? (
      <ArtworkHalo
        treatment={atmosphere?.treatment}
        testID={atmosphere?.testID}
        uri={uri}
        visible={displayed}
        onError={atmosphere?.withdrawLogoOnError ? image.onError : undefined}
      />
    ) : null;
  return renderWithAtmosphere(logo, halo);
}

/** Decorative cover inputs preserve the current source and its accepted tint without introducing fallback artwork. */
export interface SportingCoverProps {
  uri: string;
  primary: string;
}

/** Decorative cover and its tint disappear together after native decoding fails; no fallback artwork is invented. */
export function SportingCover({ uri, primary }: Readonly<SportingCoverProps>) {
  const image = useNativeImageLifecycle(uri);
  const { reducedMotion } = useTheme();
  const shown = image.status === "displayed";
  return image.status === "failed" ? null : (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      style={[
        styles.artwork,
        {
          ...artworkOpacityTransition,
          opacity: shown ? 1 : 0,
          transitionDuration:
            shown && !reducedMotion ? tokens.motion.compact.duration : 0,
        },
      ]}
    >
      <BlurredArtwork
        key={image.attemptKey}
        testID="sporting-decorative-cover"
        uri={uri}
        blurRadius={tokens.sporting.coverBlur}
        onLoad={image.onDisplay}
        onError={image.onError}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
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
  slot: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    maxWidth: "100%",
    overflow: "hidden",
  },
});
