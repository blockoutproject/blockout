import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
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
// Keep the identity gradient in its original position within the extended mask.
const horizontalCenter = `${(leadingFade + artworkWidth * 0.3) * 100}%`;
const horizontalRadius = `${artworkWidth * 78}%`;

interface ArtworkHaloProps {
  uri: string;
  testID?: string;
  onError?: () => void;
}

/** Centers vertically in the media surface and keeps decode failure local to the current source. */
export function ArtworkHalo({
  uri,
  testID = "sporting-logo-atmosphere",
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
                cx={horizontalCenter}
                cy="50%"
                rx={horizontalRadius}
                ry="60%"
              >
                <Stop offset={0} stopColor="white" stopOpacity={1} />
                <Stop offset={0.8} stopColor="white" stopOpacity={0} />
              </RadialGradient>
              <LinearGradient id={fade} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset={0} stopColor="white" stopOpacity={0} />
                <Stop offset={leadingFade} stopColor="white" stopOpacity={1} />
                <Stop offset={1} stopColor="white" stopOpacity={1} />
              </LinearGradient>
              <Mask id={mask} x={0} y={0} width="100%" height="100%">
                <Rect width="100%" height="100%" fill={`url(#${fade})`} />
              </Mask>
            </Defs>
            <Rect
              width="100%"
              height="100%"
              fill={`url(#${id})`}
              mask={`url(#${mask})`}
            />
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
    top: "50%",
    marginTop: -halo.height / 2,
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
