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
  type SharedValue,
} from "react-native-reanimated";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

const strips = [
  ["RVC", "25–19", "NVB", "REC", "LIEN", "ASV"],
  ["VBC", "3–1", "TLM", "SCO", "25–23", "RVC"],
  ["NVB", "CLUB", "REC", "1–0", "ASV", "SET 4"],
];
const tiltDegrees = -4;
const tiltRadians = Math.abs((tiltDegrees * Math.PI) / 180);

/** Measures one motif period; centered extra copies cover both edges throughout a seamless full-period loop. */
function GateStrip({
  labels,
  coverageWidth,
  progress,
}: {
  labels: readonly string[];
  coverageWidth: number;
  progress: SharedValue<number>;
}) {
  const { colors } = useTheme();
  const [period, setPeriod] = useState(0);
  const copies = period > 0 ? Math.ceil(coverageWidth / period) + 2 : 2;
  const animation = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.get() * period }],
  }));
  return (
    <View style={styles.rail}>
      <Animated.View
        style={[
          styles.strip,
          period > 0 && { width: copies * period },
          animation,
        ]}
      >
        {Array.from({ length: copies }, (_, copy) => (
          <View
            key={copy}
            style={styles.cycle}
            onLayout={
              copy === 0
                ? ({ nativeEvent }) => setPeriod(nativeEvent.layout.width)
                : undefined
            }
          >
            {labels.map((label, index) => (
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

/** Decorative diagonal community rails; native reduced motion keeps them still, including live changes. */
export function GateBackdrop() {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [reducedMotion, setReducedMotion] = useState(true);
  const progress = useSharedValue(0);
  // Inverse rotation of the measured stage bounds supplies the horizontal coverage, without a fixed overscan.
  const coverageWidth =
    area.width * Math.cos(tiltRadians) + area.height * Math.sin(tiltRadians);
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
    progress.set(0);
    if (reducedMotion) return;
    progress.set(
      withRepeat(
        withTiming(1, {
          duration: 12000,
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
      style={styles.backdrop}
      onLayout={({ nativeEvent }) => {
        const { width, height } = nativeEvent.layout;
        setArea({ width, height });
      }}
    >
      {area.width > 0 && area.height > 0 && (
        <View style={[styles.rails, { width: coverageWidth }]}>
          {strips.map((labels, row) => (
            <GateStrip
              key={row}
              labels={labels}
              coverageWidth={coverageWidth}
              progress={progress}
            />
          ))}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    overflow: "hidden",
    opacity: 0.12,
  },
  rails: { height: "100%", transform: [{ rotate: `${tiltDegrees}deg` }] },
  rail: { flex: 1, justifyContent: "center", alignItems: "center" },
  strip: { flexDirection: "row", flexShrink: 0 },
  cycle: {
    flexDirection: "row",
    flexShrink: 0,
    gap: tokens.spacing.sm,
    paddingRight: tokens.spacing.sm,
  },
  tile: {
    minWidth: 74,
    flexShrink: 0,
    height: 72,
    paddingHorizontal: tokens.spacing.xl,
    borderWidth: 3,
    borderRadius: tokens.radius.control,
    justifyContent: "center",
  },
  label: { ...tokens.typography.heading, fontSize: 17, letterSpacing: -0.68 },
});
