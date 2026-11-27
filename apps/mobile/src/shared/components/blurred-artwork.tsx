import {
  Image,
  type ImageProps,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import { cubicBezier } from "react-native-reanimated";
import { tokens } from "@/shared/theme/tokens";

/** Shared opacity transition for optional artwork already inside a readable surface. */
export const artworkOpacityTransition = {
  transitionProperty: "opacity",
  transitionTimingFunction: cubicBezier(...tokens.motion.compact.easing),
} as const;

/** Decorative image inputs; the caller retains source lifetime, sizing and shared decode-failure ownership. */
export interface BlurredArtworkProps {
  uri: string;
  blurRadius: number;
  style?: StyleProp<ImageStyle>;
  onLoad?: ImageProps["onLoad"];
  onError: NonNullable<ImageProps["onError"]>;
  testID?: string;
}

/** Uses the core native image blur to soften alpha as well as color; reload keeps URI bytes fresh like the foreground. */
export function BlurredArtwork({
  uri,
  blurRadius,
  style,
  onLoad,
  onError,
  testID,
}: Readonly<BlurredArtworkProps>) {
  return (
    <Image
      accessible={false}
      pointerEvents="none"
      source={{ uri, cache: "reload" }}
      blurRadius={blurRadius}
      resizeMode="contain"
      fadeDuration={0}
      onLoad={onLoad}
      onError={onError}
      style={style}
      testID={testID}
    />
  );
}
