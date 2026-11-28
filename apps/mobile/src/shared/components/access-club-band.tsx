import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
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

import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

const rows = [
  { phase: 13 / 16, direction: 1 },
  { phase: 5 / 16, direction: -1 },
  { phase: 1 / 16, direction: 1 },
] as const;

const tileGap = tokens.spacing.md;
const tileTravelDuration = 3200;
const tiltDegrees = 4;
const tiltRadians = (tiltDegrees * Math.PI) / 180;
const backdrop = {
  stage: { tileSize: 74, rowHeight: 101, height: 341 },
  login: { tileSize: 60, rowHeight: 76, height: 228 },
} as const;

export const compactAccessBandHeight = backdrop.login.height;

type BandGeometry = (typeof backdrop)[keyof typeof backdrop];

const loginTilePaint = StyleSheet.create({
  light: { backgroundColor: "#17171713", borderColor: "#17171724" },
  dark: { backgroundColor: "#FFFFFF1C", borderColor: "#FFFFFF20" },
});

function ClubRail({
  row,
  geometry,
  coverage,
  progress,
  compact,
  reducedMotion,
}: Readonly<{
  row: (typeof rows)[number];
  geometry: BandGeometry;
  coverage: number;
  progress: SharedValue<number>;
  compact: boolean;
  reducedMotion: boolean;
}>) {
  const { colors, scheme } = useTheme();
  const { tileSize, rowHeight } = geometry;
  const tileStride = tileSize + tileGap;
  const tileCount = Math.ceil(coverage / tileStride) + 1;
  const tilePaint = compact
    ? loginTilePaint[scheme]
    : { backgroundColor: colors.subtle, borderColor: colors.insetSurface };
  const sliding = useAnimatedStyle(() => {
    const cycle = reducedMotion ? row.phase : (progress.get() + row.phase) % 1;
    const offset = row.direction === 1 ? cycle - 1 : -cycle;
    return { transform: [{ translateX: offset * tileStride }] };
  });

  return (
    <View
      style={[
        styles.row,
        {
          height: rowHeight,
          opacity: compact && row.direction === 1 ? 0.76 : 1,
        },
      ]}
    >
      <Animated.View
        style={[styles.track, { width: tileCount * tileStride }, sliding]}
      >
        {Array.from({ length: tileCount }, (_, index) => (
          <View
            key={index}
            style={[
              styles.tile,
              tilePaint,
              { width: tileSize, height: tileSize },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

/** Decorative Access rows share one uninterrupted phase. Compact artwork is centered on the Login action card. */
export function AccessClubBand({
  compact = false,
}: Readonly<{ compact?: boolean }>) {
  const [width, setWidth] = useState(0);
  const { reducedMotion } = useTheme();
  const progress = useSharedValue(0);
  const geometry = compact ? backdrop.login : backdrop.stage;
  // The extra width keeps the slanted rows filled at the viewport edges.
  const coverage =
    width / Math.cos(tiltRadians) + geometry.height * Math.tan(tiltRadians);

  useEffect(() => {
    progress.set(0);
    if (reducedMotion) {
      return;
    }
    progress.set(
      withRepeat(
        withTiming(1, {
          duration: tileTravelDuration,
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
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      style={[
        styles.backdrop,
        compact
          ? {
              top: "50%",
              height: geometry.height,
              transform: [{ translateY: -geometry.height / 2 }],
            }
          : styles.stageBackdrop,
      ]}
    >
      {width > 0 && (
        <View
          style={[styles.rails, { width: coverage, height: geometry.height }]}
        >
          {rows.map((row) => (
            <ClubRail
              key={row.phase}
              row={row}
              geometry={geometry}
              coverage={coverage}
              compact={compact}
              progress={progress}
              reducedMotion={reducedMotion}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  // The enclosing stage or Login screen owns the clip.
  stageBackdrop: { top: 0, bottom: 0 },
  rails: {
    justifyContent: "center",
    transform: [{ rotate: `-${tiltDegrees}deg` }],
  },
  row: { justifyContent: "center" },
  track: { flexDirection: "row", gap: tileGap, flexShrink: 0 },
  tile: {
    borderRadius: tokens.radius.control,
    borderWidth: tokens.border.thin,
  },
});
