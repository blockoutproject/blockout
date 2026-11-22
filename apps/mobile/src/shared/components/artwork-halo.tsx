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
import { useId, useState } from "react";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { BlurredArtwork } from "./blurred-artwork";
import { MaskedView } from "./masked-view";

const halo = tokens.media.halo;
const leadingFade =
  halo.leadingFadeWidth / (halo.width + halo.leadingFadeWidth);
const artworkWidth = 1 - leadingFade;
const primaryCenter = `${(leadingFade + artworkWidth * 0.4) * 100}%`;
const secondaryCenter = `${(leadingFade + artworkWidth * 0.65) * 100}%`;
const horizontalRadius = `${artworkWidth * 80}%`;
const radialFadeEnd = 0.7;
// The radial fade reaches zero at the frame’s top and bottom edges.
const verticalRadius = `${50 / radialFadeEnd}%`;

interface ArtworkHaloProps {
  uri: string;
  testID?: string;
  onError?: () => void;
}

/** Follows its host's flex alignment without affecting layout. Key by source to isolate decode failure. */
export function ArtworkHalo({
  uri,
  testID = "sporting-logo-atmosphere",
  onError,
}: Readonly<ArtworkHaloProps>) {
  const [failed, setFailed] = useState(false);
  const id = useId();
  const { scheme } = useTheme();
  if (failed) {
    return null;
  }

  const fade = `${id}-fade`;
  const mask = `${id}-mask`;
  const secondary = `${id}-secondary`;
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={[
        styles.halo,
        {
          opacity: halo.opacity[scheme],
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
              <RadialGradient
                id={id}
                cx={primaryCenter}
                cy="50%"
                rx={horizontalRadius}
                ry={verticalRadius}
              >
                <Stop offset={0} stopColor="white" stopOpacity={1} />
                <Stop
                  offset={radialFadeEnd}
                  stopColor="white"
                  stopOpacity={0}
                />
              </RadialGradient>
              <RadialGradient
                id={secondary}
                cx={secondaryCenter}
                cy="50%"
                rx={horizontalRadius}
                ry={verticalRadius}
              >
                <Stop offset={0} stopColor="white" stopOpacity={1} />
                <Stop
                  offset={radialFadeEnd}
                  stopColor="white"
                  stopOpacity={0}
                />
              </RadialGradient>
              <LinearGradient id={fade} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset={0} stopColor="white" stopOpacity={0} />
                <Stop offset={leadingFade} stopColor="white" stopOpacity={1} />
                <Stop offset={1} stopColor="white" stopOpacity={0} />
              </LinearGradient>
              <Mask id={mask} x={0} y={0} width="100%" height="100%">
                <Rect width="100%" height="100%" fill={`url(#${fade})`} />
              </Mask>
            </Defs>
            <G mask={`url(#${mask})`}>
              <Rect width="100%" height="100%" fill={`url(#${id})`} />
              <Rect width="100%" height="100%" fill={`url(#${secondary})`} />
            </G>
          </Svg>
        }
      >
        <BlurredArtwork
          testID={testID}
          uri={uri}
          resizeMode="contain"
          blurRadius={halo.blur}
          onError={() => {
            setFailed(true);
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
    height: halo.height,
  },
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
