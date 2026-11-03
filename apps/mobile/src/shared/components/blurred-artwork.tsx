import {
  Image,
  type ImageProps,
  type ImageResizeMode,
  type ImageStyle,
  type StyleProp,
} from "react-native";

/** Decorative image inputs; the caller retains source lifetime, sizing and shared decode-failure ownership. */
export interface BlurredArtworkProps {
  uri: string;
  blurRadius: number;
  resizeMode: ImageResizeMode;
  style?: StyleProp<ImageStyle>;
  onError: NonNullable<ImageProps["onError"]>;
  testID?: string;
}

/** Uses the core native image blur to soften alpha as well as color; reload keeps URI bytes fresh like the foreground. */
export function BlurredArtwork({
  uri,
  blurRadius,
  resizeMode,
  style,
  onError,
  testID,
}: BlurredArtworkProps) {
  return (
    <Image
      accessible={false}
      pointerEvents="none"
      source={{ uri, cache: "reload" }}
      blurRadius={blurRadius}
      resizeMode={resizeMode}
      fadeDuration={0}
      onError={onError}
      style={style}
      testID={testID}
    />
  );
}
