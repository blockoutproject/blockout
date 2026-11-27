import { Image } from "expo-image";
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

const crests = [
  require("../../../assets/access/crest-mountain.svg"),
  require("../../../assets/access/crest-volleyball.svg"),
  require("../../../assets/access/crest-bird.svg"),
  require("../../../assets/access/crest-castle.svg"),
  require("../../../assets/access/crest-waves.svg"),
  require("../../../assets/access/crest-chevrons.svg"),
  require("../../../assets/access/crest-sun.svg"),
  require("../../../assets/access/crest-skater.svg"),
  require("../../../assets/access/crest-leaf.svg"),
  require("../../../assets/access/crest-lightning.svg"),
] as const;

const rows = [
  { offset: 0, phase: 9 / 32, direction: 1 },
  { offset: 3, phase: 17 / 32, direction: -1 },
  { offset: 7, phase: 29 / 32, direction: 1 },
] as const;

const tileGap = tokens.spacing.md;
const crestInset = tokens.spacing.tight * 3;
const tiltDegrees = 4;
const tiltRadians = (tiltDegrees * Math.PI) / 180;
const backdrop = {
  stage: { tileSize: 74, rowHeight: 101, height: 341 },
  login: { tileSize: 60, rowHeight: 76, height: 228 },
} as const;

type BandGeometry = (typeof backdrop)[keyof typeof backdrop];

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
  const { colors } = useTheme();
  const { tileSize, rowHeight } = geometry;
  const period = crests.length * (tileSize + tileGap);
  const copies = Math.ceil(coverage / period) + 1;
  const logos = [...crests.slice(row.offset), ...crests.slice(0, row.offset)];
  const tilePaint = compact
    ? {
        backgroundColor: `${colors.onDarkAccent}1C`,
        borderColor: `${colors.onDarkAccent}20`,
      }
    : { backgroundColor: colors.subtle, borderColor: colors.insetSurface };
  const crestSize = tileSize - crestInset;
  const sliding = useAnimatedStyle(() => {
    const cycle = reducedMotion
      ? row.offset / crests.length
      : (progress.get() + row.phase) % 1;
    const offset = row.direction === 1 ? cycle - 1 : -cycle;
    return { transform: [{ translateX: offset * period }] };
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
        style={[styles.track, { width: copies * period }, sliding]}
      >
        {Array.from({ length: copies }, (_, copy) => (
          <View key={copy} style={styles.cycle}>
            {logos.map((logo) => (
              <View
                key={logo}
                style={[
                  styles.tile,
                  tilePaint,
                  { width: tileSize, height: tileSize },
                ]}
              >
                <Image
                  source={logo}
                  accessible={false}
                  contentFit="contain"
                  style={{ width: crestSize, height: crestSize }}
                />
              </View>
            ))}
          </View>
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
          duration: 32000,
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
              key={row.offset}
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
    overflow: "hidden",
  },
  stageBackdrop: { top: 0, bottom: 0 },
  rails: {
    justifyContent: "center",
    transform: [{ rotate: `-${tiltDegrees}deg` }],
  },
  row: { justifyContent: "center" },
  track: { flexDirection: "row", flexShrink: 0 },
  cycle: {
    flexDirection: "row",
    gap: tileGap,
    paddingRight: tileGap,
    flexShrink: 0,
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.control,
    borderWidth: tokens.border.thin,
  },
});
