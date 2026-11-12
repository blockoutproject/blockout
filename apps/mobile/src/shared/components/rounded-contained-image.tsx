import { Image, type ImageProps } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { containedImageSize } from "../images/contained-image-size";
import { mediaRadius } from "../theme/media-radius";

/** Centered contain artwork; the caller retains source keys, native callbacks, accessibility and loading/error ownership. */
export interface RoundedContainedImageProps extends Omit<
  ImageProps,
  "contentFit" | "contentPosition"
> {
  /** Identity insets and intentional circles retain their explicit published radius. */
  radius?: number;
}

/** Clips the actual contained bitmap while keeping its native image viewport unchanged, so metadata never causes a resize read. */
export function RoundedContainedImage({
  style,
  radius,
  onLayout,
  onLoad,
  ...imageProps
}: Readonly<RoundedContainedImageProps>) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [image, setImage] = useState({ width: 0, height: 0 });
  const frame = containedImageSize(image, viewport);
  const left = frame ? (viewport.width - frame.width) / 2 : 0;
  const top = frame ? (viewport.height - frame.height) / 2 : 0;
  return (
    <View
      style={style}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewport((current) =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        );
        onLayout?.(event);
      }}
    >
      <View
        style={[
          styles.clip,
          frame
            ? {
                width: frame.width,
                height: frame.height,
                left,
                top,
                borderRadius:
                  radius ?? mediaRadius(Math.min(frame.width, frame.height)),
              }
            : styles.unmeasured,
        ]}
      >
        <Image
          {...imageProps}
          contentFit="contain"
          contentPosition="center"
          style={
            viewport.width > 0 && viewport.height > 0
              ? {
                  position: "absolute",
                  width: viewport.width,
                  height: viewport.height,
                  left: -left,
                  top: -top,
                }
              : StyleSheet.absoluteFill
          }
          onLoad={(event) => {
            const { width, height } = event.source;
            setImage((current) =>
              current.width === width && current.height === height
                ? current
                : { width, height },
            );
            onLoad?.(event);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { position: "absolute", overflow: "hidden" },
  unmeasured: { ...StyleSheet.absoluteFill, opacity: 0 },
});
