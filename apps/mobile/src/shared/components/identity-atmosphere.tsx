import { useState } from "react";
import { StyleSheet } from "react-native";
import { tokens } from "../theme/tokens";
import { BlurredArtwork } from "./blurred-artwork";

/** Decorative copy of one authorized identity source; callers key the component by URI. */
export interface IdentityAtmosphereProps {
  uri: string;
  testID?: string;
}

/** A decoding failure removes only the blurred background, preserving foreground media and the owner's rail paint. */
export function IdentityAtmosphere({ uri, testID }: IdentityAtmosphereProps) {
  const [failed, setFailed] = useState(false);
  return failed ? null : (
    <BlurredArtwork
      uri={uri}
      testID={testID}
      resizeMode="cover"
      blurRadius={tokens.media.identityAtmosphere.blur}
      onError={() => setFailed(true)}
      style={styles.atmosphere}
    />
  );
}

const styles = StyleSheet.create({
  atmosphere: {
    ...StyleSheet.absoluteFill,
    opacity: tokens.media.identityAtmosphere.opacity,
  },
});
