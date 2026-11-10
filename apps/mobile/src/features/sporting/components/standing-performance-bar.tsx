import { StyleSheet, View } from "react-native";
import type { StandingRowResponse } from "../../../../.generated/schemas/index.zod";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { standingColumnLabel } from "../model/standing-columns";

/** An optional decorative bar uses published match-count aliases; it never supplies missing numbers. */
export function StandingPerformanceBar({
  row,
  columns,
}: Readonly<{
  row: StandingRowResponse;
  columns: readonly string[];
}>) {
  const wonColumn = columns.find(
    (column) => standingColumnLabel(column) === "G",
  );
  const lostColumn = columns.find(
    (column) => standingColumnLabel(column) === "P",
  );
  const won = wonColumn === undefined ? undefined : row.statistics[wonColumn];
  const lost =
    lostColumn === undefined ? undefined : row.statistics[lostColumn];
  if (
    won === undefined ||
    lost === undefined ||
    !/^\d+$/.test(won) ||
    !/^\d+$/.test(lost)
  ) {
    return null;
  }
  const wins = Number(won);
  const losses = Number(lost);
  if (
    !Number.isSafeInteger(wins) ||
    !Number.isSafeInteger(losses) ||
    !Number.isSafeInteger(wins + losses) ||
    wins + losses === 0
  ) {
    return null;
  }
  return <WinLossBar won={wins} lost={losses} />;
}

/** Draws caller-validated nonnegative win/loss weights with a positive total; text owns their meaning. */
export function WinLossBar({
  won,
  lost,
}: Readonly<{ won: number; lost: number }>) {
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
