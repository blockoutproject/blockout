import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { CalendarCategoryEnum } from "../../../../.generated/schemas/index.zod";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useCalendarLayout } from "../hooks/use-calendar-layout";
import { calendarStyles } from "./calendar-styles";

/** Two initial dated groups use the owning calendar's measured native geometry. */
export interface CalendarLoadingProps {
  category?: CalendarCategoryEnum;
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

/** Reserves the date rail, pool heading and one fixture per group for the initial read or preview. */
export function CalendarSkeleton({
  category = "upcoming",
  columns,
  stacked,
}: Readonly<Omit<CalendarLoadingProps, "label">>) {
  const viewport = useCalendarLayout();
  const layout =
    columns === undefined || stacked === undefined
      ? viewport
      : { columns, stacked };
  const { fontScale } = useWindowDimensions();
  return (
    <View>
      {Array.from({ length: 2 }, (_, index) => (
        <View
          key={index}
          style={[styles.group, layout.stacked && styles.stackedGroup]}
        >
          <View
            style={[
              calendarStyles.dateHeading,
              layout.stacked
                ? calendarStyles.stackedDate
                : { width: `${100 / layout.columns}%` },
            ]}
          >
            <TextSkeleton role="date" width={32 * fontScale} />
            <View>
              <TextSkeleton role="metadata" width={24 * fontScale} />
              <TextSkeleton role="metadata" width={20 * fontScale} />
            </View>
          </View>
          <PoolGroupSkeleton
            completed={category === "completed"}
            stacked={layout.stacked}
          />
        </View>
      ))}
    </View>
  );
}

/** Only the shared fixture structure is known before a calendar result arrives. */
function PoolGroupSkeleton({
  completed,
  stacked,
}: Readonly<{
  completed: boolean;
  stacked: boolean;
}>) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const scoreHeight = completed
    ? Math.max(
        tokens.sporting.scoreSize,
        tokens.typography.navigation.lineHeight * fontScale +
          2 * tokens.spacing.xs,
      )
    : undefined;
  return (
    <View
      style={[
        styles.poolGroup,
        stacked ? styles.fullWidth : styles.fillColumn,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={calendarStyles.poolHeading}>
        <Skeleton
          width={tokens.size.media.row}
          height={tokens.size.media.row}
          radius={tokens.media.radius.tile}
        />
        <View style={calendarStyles.poolCopy}>
          <TextSkeleton width="85%" />
          <TextSkeleton role="metadata" width="84%" />
        </View>
      </View>
      <View
        style={[
          calendarStyles.matchInset,
          calendarStyles.firstMatch,
          calendarStyles.lastMatch,
        ]}
      >
        <View
          style={[
            calendarStyles.matchCard,
            { backgroundColor: colors.raised, borderColor: colors.border },
          ]}
        >
          <View style={calendarStyles.matchContent}>
            <View style={calendarStyles.matchTeams}>
              <TeamSkeleton scoreHeight={scoreHeight} />
              <TeamSkeleton divided scoreHeight={scoreHeight} />
            </View>
            {!completed && (
              <View
                style={[
                  calendarStyles.matchTime,
                  styles.time,
                  {
                    width: tokens.sporting.calendarMatch.timeWidth * fontScale,
                  },
                ]}
              >
                <TextSkeleton width={34 * fontScale} />
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

/** Actual 32-point logos and line boxes determine each row's height as text scales. */
function TeamSkeleton({
  divided = false,
  scoreHeight,
}: Readonly<{
  divided?: boolean;
  scoreHeight?: number;
}>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        calendarStyles.matchTeam,
        divided && {
          borderTopWidth: tokens.border.thin,
          borderColor: colors.border,
        },
      ]}
    >
      <Skeleton
        width={tokens.size.media.match}
        height={tokens.size.media.match}
        radius={tokens.media.radius.list}
      />
      <View style={styles.teamCopy}>
        <TextSkeleton width="90%" />
      </View>
      {scoreHeight !== undefined && (
        <Skeleton
          width={tokens.sporting.scoreSize}
          height={scoreHeight}
          radius={tokens.radius.sm}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: tokens.layout.list.gap,
  },
  stackedGroup: { flexDirection: "column" },
  poolGroup: {
    minWidth: 0,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  fillColumn: { flex: 1 },
  fullWidth: { width: "100%" },
  time: { alignItems: "center" },
  teamCopy: { flex: 1, minWidth: 0 },
});
