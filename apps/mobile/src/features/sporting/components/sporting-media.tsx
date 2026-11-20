import { Image } from "expo-image";
import { BlurredArtwork } from "@/shared/components/blurred-artwork";
import { ImageFallback } from "@/shared/components/image-fallback";
import { MaskedView } from "@/shared/components/masked-view";
import { useId, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  G,
  LinearGradient,
  Mask,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import type { SportingIdentityResponse } from "../../../../.generated/schemas/index.zod";
import { Skeleton } from "@/shared/components/skeleton";
import { useNativeImageLifecycle } from "@/shared/images/use-native-image-lifecycle";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { mediaRadius } from "@/shared/theme/media-radius";

type AtmosphereLayout = "horizontal" | "card" | "podium" | "crest";

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
        layout?: AtmosphereLayout;
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
    const radius = identityPlate ? borderRadius : mediaRadius(imageSize);
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
  const imageSize = size * artworkScale;
  const nativeImageSize = (nativeSize ?? size) * artworkScale;
  const borderRadius = identityPlate
    ? tokens.media.radius.profile
    : mediaRadius(size);
  const frame = {
    width: size,
    borderRadius,
    backgroundColor: colors.logoSurface,
  };
  const logo = (
    <View style={[styles.media, frame]}>
      <View
        accessible={!available}
        accessibilityRole={available ? undefined : "image"}
        accessibilityLabel={
          available ? undefined : `${label} : ${identity.name}`
        }
        accessibilityState={{ busy: !available && busy }}
        style={[styles.slot, frame, { height: size }]}
      >
        {available && renderArtwork()}
        {!available && !busy && (
          <ImageFallback
            color={colors.logoInk}
            size={
              presentation === "logo"
                ? tokens.size.icon.md
                : tokens.size.icon.lg
            }
          />
        )}
        {busy && (
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
  const halo =
    available && atmosphere !== false ? (
      <SportingAtmosphere
        key={image.attemptKey}
        testID={atmosphere?.testID}
        uri={uri}
        layout={atmosphere?.layout}
        onError={atmosphere?.withdrawLogoOnError ? image.onError : undefined}
      />
    ) : null;
  return renderWithAtmosphere(logo, halo);
}

/** Optional crest light owns native decoding unless the caller couples failure to the foreground. */
export function SportingAtmosphere({
  uri,
  onError,
  testID = "sporting-logo-atmosphere",
  layout = "horizontal",
}: Readonly<{
  uri: string;
  onError?: () => void;
  testID?: string;
  layout?: AtmosphereLayout;
}>) {
  const image = useNativeImageLifecycle(uri);
  const id = useId();
  const { scheme } = useTheme();
  if (image.status === "failed") {
    return null;
  }
  const horizontal = layout === "horizontal" || layout === "card";
  const atmosphere = tokens.sporting.atmosphere;
  const fade = `${id}-fade`;
  const mask = `${id}-mask`;
  const secondary = `${id}-secondary`;
  const maskedArtwork = (
    <MaskedView
      accessible={false}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      maskElement={
        <Svg accessible={false} width="100%" height="100%">
          <Defs>
            <RadialGradient
              id={id}
              cx={horizontal ? "40%" : "50%"}
              cy="50%"
              rx={horizontal ? "80%" : "50%"}
              ry={horizontal ? "85%" : "50%"}
            >
              <Stop offset={0} stopColor="white" stopOpacity={1} />
              <Stop
                offset={horizontal ? 0.7 : 1}
                stopColor="white"
                stopOpacity={0}
              />
            </RadialGradient>
            {horizontal && (
              <>
                <RadialGradient
                  id={secondary}
                  cx="65%"
                  cy="50%"
                  rx="80%"
                  ry="85%"
                >
                  <Stop offset={0} stopColor="white" stopOpacity={1} />
                  <Stop offset={0.7} stopColor="white" stopOpacity={0} />
                </RadialGradient>
                <LinearGradient id={fade} x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset={0} stopColor="white" stopOpacity={1} />
                  <Stop offset={1} stopColor="white" stopOpacity={0} />
                </LinearGradient>
                <Mask id={mask} x={0} y={0} width="100%" height="100%">
                  <Rect width="100%" height="100%" fill={`url(#${fade})`} />
                </Mask>
              </>
            )}
          </Defs>
          <G mask={horizontal ? `url(#${mask})` : undefined}>
            <Rect width="100%" height="100%" fill={`url(#${id})`} />
            {horizontal && (
              <Rect width="100%" height="100%" fill={`url(#${secondary})`} />
            )}
          </G>
        </Svg>
      }
    >
      <BlurredArtwork
        key={image.attemptKey}
        testID={testID}
        uri={uri}
        resizeMode="contain"
        blurRadius={atmosphere.blur}
        onError={() => {
          image.onError();
          onError?.();
        }}
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              {
                scale:
                  layout === "crest" ? atmosphere.crestScale : atmosphere.scale,
              },
            ],
          },
        ]}
      />
    </MaskedView>
  );
  if (layout === "podium") {
    return maskedArtwork;
  }
  // MaskedView's legacy native manager does not apply the Fabric blend mode.
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={[
        horizontal ? styles.horizontalAtmosphere : StyleSheet.absoluteFill,
        horizontal &&
          (layout === "card"
            ? styles.cardAtmosphere
            : styles.stretchedAtmosphere),
        {
          opacity: atmosphere.opacity[scheme],
          mixBlendMode: scheme === "dark" ? "screen" : "normal",
        },
      ]}
    >
      {maskedArtwork}
    </View>
  );
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
  horizontalAtmosphere: {
    position: "absolute",
    top: 0,
    left: 0,
    width: tokens.sporting.atmosphere.horizontalWidth,
  },
  cardAtmosphere: {
    height: tokens.sporting.atmosphere.cardHeight,
  },
  stretchedAtmosphere: { bottom: 0 },
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
