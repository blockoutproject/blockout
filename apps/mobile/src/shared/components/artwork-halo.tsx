import { StyleSheet, View, type ViewStyle } from "react-native";
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

const radialFadeEnd = 0.7;
// The radial fade reaches zero at the frame’s top and bottom edges.
const verticalRadius = `${50 / radialFadeEnd}%`;

export type ArtworkHaloPlacement = "centered-leading" | ViewStyle;

interface ArtworkHaloProps {
  uri: string;
  testID?: string;
  /** Custom positions fade at the leading edge because they can start inside the card. */
  placement?: ArtworkHaloPlacement;
  onError?: () => void;
}

/** Callers key the halo by its artwork source so a decode failure stays local to that source. */
export function ArtworkHalo({
  uri,
  testID = "sporting-logo-atmosphere",
  placement,
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
  const centeredLeading = placement === "centered-leading";
  const atCardEdge = placement === undefined || centeredLeading;
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={[
        styles.halo,
        centeredLeading
          ? styles.centeredLeading
          : (placement ?? styles.upperLeft),
        {
          opacity: tokens.media.halo.opacity[scheme],
          // MaskedView's legacy native manager cannot apply the Fabric blend mode.
          mixBlendMode: scheme === "dark" ? "screen" : "normal",
        },
      ]}
    >
      <MaskedView
        accessible={false}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        maskElement={
          <Svg accessible={false} width="100%" height="100%">
            <Defs>
              <RadialGradient
                id={id}
                cx="40%"
                cy="50%"
                rx="80%"
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
                cx="65%"
                cy="50%"
                rx="80%"
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
                <Stop
                  offset={0}
                  stopColor="white"
                  stopOpacity={atCardEdge ? 1 : 0}
                />
                <Stop offset={0.1} stopColor="white" stopOpacity={0.9} />
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
          blurRadius={tokens.media.halo.blur}
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
    width: tokens.media.halo.width,
    aspectRatio: tokens.media.halo.width / tokens.media.halo.height,
  },
  upperLeft: { top: 0, left: 0 },
  centeredLeading: {
    left: 0,
    top: "50%",
    marginTop: -tokens.media.halo.height / 2,
  },
  image: {
    ...StyleSheet.absoluteFill,
    transform: [{ scale: tokens.media.halo.scale }],
  },
});
