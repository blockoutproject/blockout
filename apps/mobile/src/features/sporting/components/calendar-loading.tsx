import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useCalendarLayout } from "../hooks/use-calendar-layout";

/** Two initial dated groups; an existing calendar supplies its measured native geometry. */
export interface CalendarLoadingProps {
  columns?: number;
  stacked?: boolean;
  label?: string;
}

/** Published calendar anatomy; admission uses the same viewport calculation until its native list exists. */
export function CalendarLoading({
  label = "Chargement des matchs",
  ...props
}: CalendarLoadingProps) {
  return (
    <LoadingGroup label={label}>
      <CalendarSkeleton {...props} />
    </LoadingGroup>
  );
}

/** Decorative dated groups can join an identity in one already announced page loading composition. */
export function CalendarSkeleton({
  columns,
  stacked,
}: Omit<CalendarLoadingProps, "label">) {
  return columns === undefined || stacked === undefined ? (
    <ViewportCalendarLoading />
  ) : (
    <CalendarLoadingContent columns={columns} stacked={stacked} />
  );
}

/** Reads viewport geometry only for a destination whose calendar list has not mounted. */
function ViewportCalendarLoading() {
  const layout = useCalendarLayout();
  return <CalendarLoadingContent {...layout} />;
}

/** Shares the ready scene's lateral columns and trailing group spacing without another measurement or scroll container. */
function CalendarLoadingContent({
  columns,
  stacked,
}: {
  columns: number;
  stacked: boolean;
}) {
  return (
    <View>
      {Array.from({ length: 2 }, (_, index) => (
        <View
          key={index}
          style={[styles.group, stacked && styles.stackedGroup]}
        >
          <View
            style={[
              styles.date,
              stacked ? styles.stackedDate : { width: `${100 / columns}%` },
            ]}
          >
            <Skeleton width={32} height={28} />
            <Skeleton width={24} height={10} />
            <Skeleton width={20} height={10} />
          </View>
          <PoolGroupSkeleton stacked={stacked} />
        </View>
      ))}
    </View>
  );
}

/** One pool heading and one fixture with its two team rows, never provider dates, scores or names. */
function PoolGroupSkeleton({ stacked }: { stacked: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.poolGroup,
        stacked ? styles.fullWidth : styles.fillColumn,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.headingInset}>
        <View style={styles.heading}>
          <Skeleton width={40} height={40} />
          <View style={styles.headingCopy}>
            <Skeleton />
            <Skeleton width="70%" height={10} />
          </View>
        </View>
      </View>
      <View style={styles.fixtureInset}>
        <View style={[styles.fixture, { borderColor: colors.border }]}>
          <View style={styles.teams}>
            <TeamSkeleton />
            <TeamSkeleton divided />
          </View>
          <View style={[styles.time, { backgroundColor: colors.skeleton }]} />
        </View>
      </View>
    </View>
  );
}

/** A decorative crest and proportional team name retain the fixture's 56-point native row. */
function TeamSkeleton({ divided = false }: { divided?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.team,
        divided && {
          borderTopWidth: tokens.border.thin,
          borderColor: colors.border,
        },
      ]}
    >
      <Skeleton width={tokens.size.icon.lg} height={tokens.size.icon.lg} />
      <View style={styles.teamCopy}>
        <Skeleton height={11} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: tokens.spacing.md,
  },
  stackedGroup: { flexDirection: "column" },
  date: { gap: tokens.spacing.xs, paddingRight: tokens.spacing.xs },
  stackedDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
  },
  poolGroup: {
    minWidth: 0,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  fillColumn: { flex: 1 },
  fullWidth: { width: "100%" },
  headingInset: { padding: tokens.spacing.xs, paddingBottom: 0 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    minHeight: 64,
  },
  headingCopy: { flex: 1, minWidth: 0, gap: tokens.spacing.sm },
  fixtureInset: { padding: tokens.spacing.lg },
  fixture: {
    height: 112,
    flexDirection: "row",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    overflow: "hidden",
  },
  time: { width: 52 },
  teams: { flex: 1, minWidth: 0 },
  team: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  teamCopy: { flex: 1, minWidth: 0 },
});
