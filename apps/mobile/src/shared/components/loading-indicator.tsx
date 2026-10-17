import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { tokens } from "../theme/tokens";

/** Reuses the approved 20 px action glyph; Reanimated's native System policy keeps reduced motion static. */
export function LoadingIndicator({ color }: { color: string }) {
  const rotation = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: tokens.motion.slow,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);

  return (
    <Animated.View style={[styles.slot, style]} accessible={false}>
      <Image
        source={require("../../../assets/icons/loading.svg")}
        tintColor={color}
        style={styles.slot}
        contentFit="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { width: tokens.size.loading, height: tokens.size.loading },
});
