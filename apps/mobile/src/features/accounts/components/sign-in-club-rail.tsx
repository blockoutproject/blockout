import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useReducedMotion } from "@/shared/theme/use-reduced-motion";

const marks = ["MV", "CO", "RC", "VB", "AS", "NV", "TL", "SC"];
const markSize = 38;
const period = marks.length * (markSize + tokens.spacing.sm);

/** Repeats one decorative motif toward the right; the existing live motion preference owns the loop. */
export function SignInClubRail() {
  const { colors, membership } = useTheme();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const copies = Math.ceil(width / period) + 2;
  const animation = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.get() - 1) * period }],
  }));

  useEffect(() => {
    progress.set(0);
    if (reducedMotion) {
      return;
    }
    progress.set(
      withRepeat(
        withTiming(1, {
          duration: 46000,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.Never,
        }),
        -1,
        false,
        undefined,
        ReduceMotion.Never,
      ),
    );
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion]);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.rail}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    >
      <Animated.View
        style={[styles.track, { width: copies * period }, animation]}
      >
        {Array.from({ length: copies }, (_, copy) => (
          <View key={copy} style={styles.cycle}>
            {marks.map((mark, position) => (
              <View
                key={mark}
                style={[
                  styles.mark,
                  {
                    backgroundColor:
                      position % 3 === 0 ? membership.fill : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    tokens.typography.metadata,
                    {
                      color:
                        position % 3 === 0 ? membership.content : colors.text,
                    },
                  ]}
                >
                  {mark}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { height: 42, overflow: "hidden" },
  track: { flexDirection: "row", flexShrink: 0 },
  cycle: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    paddingRight: tokens.spacing.sm,
    flexShrink: 0,
  },
  mark: {
    width: markSize,
    height: markSize,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.control,
    borderWidth: tokens.border.thin,
  },
});
