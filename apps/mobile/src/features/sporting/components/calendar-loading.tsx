import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { TextSkeleton } from "../../../shared/components/text-skeleton";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useCalendarLayout } from "../hooks/use-calendar-layout";

/** Two initial dated groups use the owning calendar's measured native geometry. */
export interface CalendarLoadingProps {
  columns?: number;
  stacked?: boolean;
  label?: string;
}

/** One accessible announcement surrounds the decorative initial calendar. */
export function CalendarLoading({
  label = "Chargement des matchs",
  ...props
}: Readonly<CalendarLoadingProps>) {
  return (
    <LoadingGroup label={label}>
      <CalendarSkeleton {...props} />
    </LoadingGroup>
  );
}

/** Decorative dated groups can join an identity in an already announced page read. */
export function CalendarSkeleton({
  columns,
  stacked,
}: Readonly<Omit<CalendarLoadingProps, "label">>) {
  return columns === undefined || stacked === undefined ? (
    <ViewportCalendarLoading />
  ) : (
    <CalendarLoadingContent columns={columns} stacked={stacked} />
  );
}

/** Uses the existing grid calculation before a calendar list has mounted. */
function ViewportCalendarLoading() {
  const layout = useCalendarLayout();
  return <CalendarLoadingContent {...layout} />;
}

/** Dates and two bounded groups begin where the real native list content begins. */
function CalendarLoadingContent({
  columns,
  stacked,
}: Readonly<{
  columns: number;
  stacked: boolean;
}>) {
  const { fontScale } = useWindowDimensions();
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
            <TextSkeleton role="date" width={32 * fontScale} />
            <View>
              <TextSkeleton role="metadata" width={24 * fontScale} />
              <TextSkeleton role="metadata" width={20 * fontScale} />
            </View>
          </View>
          <PoolGroupSkeleton stacked={stacked} status={index === 0} />
        </View>
      ))}
    </View>
  );
}

/** A neutral two-line pool identity heading and fixture keep the loaded card's borders and insets. */
function PoolGroupSkeleton({
  stacked,
  status,
}: Readonly<{
  stacked: boolean;
  status: boolean;
}>) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <View
      style={[
        styles.poolGroup,
        stacked ? styles.fullWidth : styles.fillColumn,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.headingInset}>
        <View
          style={[styles.heading, { backgroundColor: colors.skeletonHeader }]}
        >
          <Skeleton
            width={tokens.size.media.row}
            height={tokens.size.media.row}
          />
          <View style={styles.headingCopy}>
            <TextSkeleton width="85%" />
            <TextSkeleton role="metadata" width="84%" />
          </View>
        </View>
      </View>
      <View style={styles.fixtureInset}>
        <View style={[styles.fixture, { borderColor: colors.border }]}>
          {status && (
            <View
              style={[
                styles.status,
                { backgroundColor: colors.skeletonHeader },
              ]}
            >
              <TextSkeleton role="metadata" width={80 * fontScale} />
            </View>
          )}
          <View style={styles.fixtureContent}>
            <View style={styles.teams}>
              <TeamSkeleton continuation />
              <TeamSkeleton divided />
            </View>
            <View
              style={[
                styles.time,
                {
                  width: 56 * fontScale,
                  backgroundColor: colors.skeletonHeader,
                },
              ]}
            >
              <TextSkeleton width={34 * fontScale} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Actual 32-point logos and line boxes determine each row's height as text scales. */
function TeamSkeleton({
  divided = false,
  continuation = false,
}: Readonly<{
  divided?: boolean;
  continuation?: boolean;
}>) {
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
      <Skeleton
        width={tokens.size.media.match}
        height={tokens.size.media.match}
      />
      <View style={styles.teamCopy}>
        <TextSkeleton width="90%" />
        {continuation && <TextSkeleton width="65%" />}
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
    gap: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderTopLeftRadius: tokens.radius.panelInset,
    borderTopRightRadius: tokens.radius.panelInset,
  },
  headingCopy: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  fixtureInset: { padding: tokens.spacing.lg },
  fixture: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    overflow: "hidden",
  },
  status: {
    alignItems: "center",
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.tight,
  },
  fixtureContent: { flexDirection: "row", alignItems: "stretch" },
  time: {
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacing.xs,
  },
  teams: { flex: 1, minWidth: 0 },
  team: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    padding: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  teamCopy: { flex: 1, minWidth: 0 },
});
