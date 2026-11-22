import { Image } from "expo-image";
import { ArtworkHalo } from "@/shared/components/artwork-halo";
import { BlurredArtwork } from "@/shared/components/blurred-artwork";
import { ImageFallback } from "@/shared/components/image-fallback";
import { useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { SportingIdentityResponse } from "../../../../.generated/schemas/index.zod";
import { useNativeImageLifecycle } from "@/shared/images/use-native-image-lifecycle";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { mediaRadius } from "@/shared/theme/media-radius";

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
  /** Keep Expo Image's bounds fixed when the same artwork slot is visually resized. */
  nativeSize?: number;
  presentation?: "logo" | "entity" | "identity";
  /** The owner places both layers. A failed sharp source withdraws its decoration as well. */
  renderWithAtmosphere?: (logo: ReactNode, atmosphere: ReactNode) => ReactNode;
  /** False keeps the foreground composition mounted with no decorative image. */
  atmosphere?:
    | false
    | Readonly<{
        placement?: StyleProp<ViewStyle>;
        testID?: string;
        /** Standings retain their paired fallback if either native image fails. */
        withdrawLogoOnError?: boolean;
      }>;
}

/** Keeps native media beneath its skeleton without remounting the caller's card. */
export function SportingMedia({
  identity,
  uri,
  loading = false,
  error = false,
  kind,
  size = tokens.size.media.row,
  nativeSize,
  presentation = "logo",
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
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${label} : ${identity.name}`}
        accessibilityState={{ busy }}
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
  const busy = available ? image.status === "pending" : loading;
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
  const logo = (
    <View
      accessible={!available}
      accessibilityRole={available ? undefined : "image"}
      accessibilityLabel={available ? undefined : `${label} : ${identity.name}`}
      accessibilityState={{ busy: !available && busy }}
      style={[
        styles.slot,
        {
          width: size,
          height: size,
          // IdentityCard already clips its artwork slot.
          borderRadius: identityPlate ? undefined : mediaRadius(size),
          backgroundColor: busy ? undefined : colors.logoSurface,
        },
      ]}
    >
      {available && renderArtwork()}
      {!available && !busy && (
        <ImageFallback
          color={colors.logoInk}
          size={
            presentation === "logo" ? tokens.size.icon.md : tokens.size.icon.lg
          }
        />
      )}
      {busy && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.skeleton },
          ]}
        />
      )}
    </View>
  );
  if (!renderWithAtmosphere) {
    return logo;
  }
  const halo =
    available && atmosphere !== false ? (
      <ArtworkHalo
        key={image.attemptKey}
        testID={atmosphere?.testID}
        uri={uri}
        placement={atmosphere?.placement}
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
  slot: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    maxWidth: "100%",
    overflow: "hidden",
  },
});
