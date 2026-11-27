import {
  Image,
  type ImageProps,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

/** Blends admitted decoration in place and hides obsolete artwork immediately. */
export function useArtworkOpacity(opacity: number, animate = true) {
  const { reducedMotion } = useTheme();
  return useAnimatedStyle(() => ({
    opacity:
      opacity > 0 && animate && !reducedMotion
        ? withTiming(opacity, {
            duration: tokens.motion.compact.duration,
            easing: Easing.bezier(...tokens.motion.compact.easing),
            reduceMotion: ReduceMotion.Never,
          })
        : opacity,
  }));
}

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
