import { useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { BlurredArtwork } from "./blurred-artwork";
import { MaskedView } from "./masked-view";

/** Decorative copy of one authorized identity source; callers key the component by URI. */
export interface IdentityAtmosphereProps {
  uri: string;
  testID?: string;
}

/** A localized surface halo keeps its native decode state independent of the foreground. */
export function IdentityAtmosphere({ uri, testID }: IdentityAtmosphereProps) {
  const { scheme } = useTheme();
  const gradient = useId();
  const [failed, setFailed] = useState(false);
  const appearance = tokens.media.identityAtmosphere;
  return failed ? null : (
    <View
      pointerEvents="none"
      accessible={false}
      style={[
        styles.atmosphere,
        {
          opacity: appearance.opacity[scheme],
          mixBlendMode: scheme === "dark" ? "screen" : "normal",
        },
      ]}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id={gradient} cx="30%" cy="38%" rx="78%" ry="70%">
                <Stop offset={0} stopColor="white" stopOpacity={1} />
                <Stop offset={0.8} stopColor="white" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${gradient})`} />
          </Svg>
        }
      >
        <BlurredArtwork
          uri={uri}
          testID={testID}
          resizeMode="contain"
          blurRadius={appearance.blur}
          onError={() => setFailed(true)}
          style={styles.image}
        />
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  atmosphere: {
    position: "absolute",
    top: 0,
    left: 0,
    width: tokens.media.identityAtmosphere.width,
    height: tokens.media.identityAtmosphere.height,
  },
  image: {
    ...StyleSheet.absoluteFill,
    transform: [{ scale: tokens.media.identityAtmosphere.scale }],
  },
});
