import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

const strips = [
  [
    "RVC",
    "25–19",
    "NVB",
    "REC",
    "LIEN",
    "ASV",
    "RVC",
    "25–19",
    "NVB",
    "REC",
    "LIEN",
    "ASV",
  ],
  [
    "VBC",
    "3–1",
    "TLM",
    "SCO",
    "25–23",
    "RVC",
    "VBC",
    "3–1",
    "TLM",
    "SCO",
    "25–23",
    "RVC",
  ],
  [
    "NVB",
    "CLUB",
    "REC",
    "1–0",
    "ASV",
    "SET 4",
    "NVB",
    "CLUB",
    "REC",
    "1–0",
    "ASV",
    "SET 4",
  ],
];

/** Decorative diagonal community rails; native reduced motion keeps them still, including live changes. */
export function GateBackdrop() {
  const { colors } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(true);
  const offset = useSharedValue(0);
  const animation = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));
  useEffect(() => {
    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReducedMotion(value);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    offset.set(0);
    if (reducedMotion) return;
    offset.set(
      withRepeat(
        withTiming(-120, {
          duration: 12000,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.Never,
        }),
        -1,
        true,
        undefined,
        ReduceMotion.Never,
      ),
    );
    return () => cancelAnimation(offset);
  }, [offset, reducedMotion]);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.backdrop}
    >
      <Animated.View style={animation}>
        {strips.map((strip, row) => (
          <View key={row} style={styles.strip}>
            {strip.map((label, index) => (
              <View
                key={index}
                style={[
                  styles.tile,
                  {
                    backgroundColor: colors.raised,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.label, { color: colors.text }]}>
                  {label}
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
  backdrop: {
    position: "absolute",
    width: 1062,
    alignSelf: "center",
    opacity: 0.12,
    transform: [{ translateY: 74 }, { rotate: "-4deg" }],
  },
  strip: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    marginVertical: tokens.spacing.sm,
  },
  tile: {
    minWidth: 74,
    height: 72,
    paddingHorizontal: tokens.spacing.xl,
    borderWidth: 3,
    borderRadius: tokens.radius.control,
    justifyContent: "center",
  },
  label: { ...tokens.typography.heading, fontSize: 17, letterSpacing: -0.68 },
});
