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
import { useId } from "react";
import { useNativeImageLifecycle } from "@/shared/images/use-native-image-lifecycle";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { BlurredArtwork } from "./blurred-artwork";
import { MaskedView } from "./masked-view";

const halo = tokens.media.halo;
const leadingFade =
  halo.leadingFadeWidth / (halo.width + halo.leadingFadeWidth);
const artworkWidth = 1 - leadingFade;
const identityRadial = {
  centers: [0.3],
  radiusX: 0.78,
  radiusY: "60%",
  fadeEnd: 0.8,
  trailingOpacity: 1,
};
const washFadeEnd = 0.7;

const treatments = {
  identity: identityRadial,
  crest: {
    ...identityRadial,
    centers: [0.5],
    // The radial fade reaches zero at both sides of the centered frame.
    radiusX: 0.5 / identityRadial.fadeEnd,
  },
  standingsRow: {
    centers: [0.4, 0.65],
    radiusX: 0.8,
    radiusY: `${50 / washFadeEnd}%`,
    fadeEnd: washFadeEnd,
    trailingOpacity: 0,
  },
};

export type ArtworkHaloTreatment = keyof typeof treatments;

interface ArtworkHaloProps {
  uri: string;
  treatment?: ArtworkHaloTreatment;
  testID?: string;
  /** A same-source halo can load in parallel but waits for the foreground to draw. */
  visible?: boolean;
  onError?: () => void;
}

/** Uses the host's media alignment and keeps decode failure local to the current source. */
export function ArtworkHalo({
  uri,
  treatment = "identity",
  testID = "sporting-logo-atmosphere",
  visible = true,
  onError,
}: Readonly<ArtworkHaloProps>) {
  const image = useNativeImageLifecycle(uri);
  const id = useId();
  const { scheme } = useTheme();
  if (image.status === "failed") {
    return null;
  }

  const fade = `${id}-fade`;
  const mask = `${id}-mask`;
  const radial = treatments[treatment];
  const radiusX = `${artworkWidth * radial.radiusX * 100}%`;
  const gradients = radial.centers.map((center, index) => ({
    id: `${id}-${index}`,
    center: `${(leadingFade + artworkWidth * center) * 100}%`,
  }));
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={[
        styles.halo,
        treatment === "standingsRow" ? styles.compact : styles.centered,
        {
          opacity: visible ? halo.opacity[scheme] : 0,
          // MaskedView's legacy native manager cannot apply the Fabric blend mode.
          mixBlendMode: scheme === "dark" ? "screen" : "normal",
        },
      ]}
    >
      <MaskedView
        accessible={false}
        pointerEvents="none"
        style={styles.mask}
        maskElement={
          <Svg accessible={false} width="100%" height="100%">
            <Defs>
              {gradients.map((gradient) => (
                <RadialGradient
                  key={gradient.id}
                  id={gradient.id}
                  cx={gradient.center}
                  cy="50%"
                  rx={radiusX}
                  ry={radial.radiusY}
                >
                  <Stop offset={0} stopColor="white" stopOpacity={1} />
                  <Stop
                    offset={radial.fadeEnd}
                    stopColor="white"
                    stopOpacity={0}
                  />
                </RadialGradient>
              ))}
              <LinearGradient id={fade} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset={0} stopColor="white" stopOpacity={0} />
                <Stop offset={leadingFade} stopColor="white" stopOpacity={1} />
                <Stop
                  offset={1}
                  stopColor="white"
                  stopOpacity={radial.trailingOpacity}
                />
              </LinearGradient>
              <Mask id={mask} x={0} y={0} width="100%" height="100%">
                <Rect width="100%" height="100%" fill={`url(#${fade})`} />
              </Mask>
            </Defs>
            <G mask={`url(#${mask})`}>
              {gradients.map((gradient) => (
                <Rect
                  key={gradient.id}
                  width="100%"
                  height="100%"
                  fill={`url(#${gradient.id})`}
                />
              ))}
            </G>
          </Svg>
        }
      >
        <BlurredArtwork
          key={image.attemptKey}
          testID={testID}
          uri={uri}
          blurRadius={halo.blur}
          onError={() => {
            image.onError();
            onError?.();
          }}
          style={styles.image}
        />
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: "absolute",
    width: halo.width,
  },
  centered: {
    top: "50%",
    marginTop: -halo.height / 2,
    height: halo.height,
  },
  compact: { height: halo.compactHeight },
  // The fade can extend outside the artwork frame. The surface clips it at its own outline.
  mask: {
    ...StyleSheet.absoluteFill,
    left: -halo.leadingFadeWidth,
  },
  image: {
    ...StyleSheet.absoluteFill,
    left: halo.leadingFadeWidth,
    transform: [{ scale: halo.scale }],
  },
});
