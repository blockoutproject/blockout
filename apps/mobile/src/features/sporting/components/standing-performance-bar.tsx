import { StyleSheet, View } from "react-native";
import type { StandingRowResponse } from "../../../../.generated/schemas/index.zod";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** An optional decorative ratio requires exact published G/P counts; it never supplies missing numbers. */
export function StandingPerformanceBar({
  row,
  columns,
}: {
  row: StandingRowResponse;
  columns: readonly string[];
}) {
  const won = row.statistics.G;
  const lost = row.statistics.P;
  if (
    !columns.includes("G") ||
    !columns.includes("P") ||
    won === undefined ||
    lost === undefined ||
    !/^\d+$/.test(won) ||
    !/^\d+$/.test(lost)
  )
    return null;
  const wins = Number(won);
  const losses = Number(lost);
  if (
    !Number.isSafeInteger(wins) ||
    !Number.isSafeInteger(losses) ||
    !Number.isSafeInteger(wins + losses) ||
    wins + losses === 0
  )
    return null;
  return <WinLossBar won={wins} lost={losses} />;
}

/** Draws caller-validated nonnegative win/loss weights with a positive total; text owns their meaning. */
export function WinLossBar({ won, lost }: { won: number; lost: number }) {
  const { colors } = useTheme();
  return (
    <View accessible={false} pointerEvents="none" style={styles.performanceBar}>
      {won > 0 && (
        <View
          style={[
            styles.performanceSegment,
            { flex: won, backgroundColor: colors.performance.won },
          ]}
        />
      )}
      {lost > 0 && (
        <View
          style={[
            styles.performanceSegment,
            { flex: lost, backgroundColor: colors.performance.lost },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  performanceBar: {
    flexDirection: "row",
    gap: tokens.spacing.optical,
    height: tokens.sporting.standingsCard.performanceHeight,
  },
  performanceSegment: {
    height: tokens.sporting.standingsCard.performanceHeight,
  },
});
