import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

/** Decorative local media uses the supplied still as soon as motion is reduced or its card is inactive. */
export function AccessCelebration({
  animated = true,
}: Readonly<{ animated?: boolean }>) {
  const { colors, reducedMotion } = useTheme();
  return (
    <Image
      accessible={false}
      source={
        animated && !reducedMotion
          ? require("../../../assets/access/volleyball-loop.gif")
          : require("../../../assets/access/volleyball-still.png")
      }
      contentFit="contain"
      style={[styles.artwork, { backgroundColor: colors.mediaPlaceholder }]}
    />
  );
}

const styles = StyleSheet.create({
  artwork: {
    width: "100%",
    maxWidth: 280,
    aspectRatio: 3 / 2,
    borderRadius: tokens.media.radius.profile,
    alignSelf: "center",
  },
});
