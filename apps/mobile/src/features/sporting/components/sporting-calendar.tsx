import type { LegendListRef } from "@legendapp/list/react-native";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  AppState,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useCollapsingTabsContext } from "react-native-collapsible-tab";
import { TabLegendList } from "react-native-collapsible-tab/legend-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  MatchPoolGroupResponse,
  MatchSummaryResponse,
} from "../../../../.generated/schemas/index.zod";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { pageContentStyle } from "../../../shared/components/page";
import { pagedListDefaults } from "../../../shared/components/paged-tabs";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  createCalendarOptions,
  refreshCalendar,
  calendarDays,
  type CalendarSelection,
} from "../api/sporting-calendar";
import { useConsultationQueries } from "../api/use-consultation-queries";
import { calendarRows, type CalendarRow } from "../model/calendar-rows";
import {
  currentSportingTimeZone,
  formatSportingDay,
} from "../model/sporting-time";
import { divisionTextColor } from "../presentation";
import { genderLabel } from "../classification-presentation";
import { CalendarMatch } from "./calendar-match";
import { DivisionPaint } from "./division-paint";
import { SportingLogo, SportingArtwork } from "./sporting-identity";

/** One native tab owns its exact calendar traversal; inactive panels keep data without issuing reads. */
export interface SportingCalendarProps {
  selection: Omit<CalendarSelection, "timeZone">;
  active?: boolean;
}

/**
 * Individually virtualized encounters retain Query's complete days and pool grouping. Native sticky
 * day cells share the collapsing header's measured inset; foreground changes only time formatting.
 */
export function SportingCalendar({
  selection,
  active = true,
}: SportingCalendarProps) {
  const queries = useConsultationQueries();
  const client = useQueryClient();
  const navigation = useNavigation();
  const [zone, setZone] = useState(currentSportingTimeZone);
  const [displayZone, setDisplayZone] = useState(currentSportingTimeZone);
  const [refreshing, setRefreshing] = useState(false);
  const list = useRef<LegendListRef>(null);
  const options = createCalendarOptions(queries, {
    ...selection,
    timeZone: zone,
  });
  const calendar = useInfiniteQuery({
    ...options,
    enabled: (query) => active && !refreshing && query.state.status !== "error",
    // Native Query preserves the accepted grouping only while its explicit replacement is pending.
    placeholderData: refreshing ? keepPreviousData : undefined,
  });
  const groupingZone = calendar.data?.pages[0]?.timeZone ?? zone;
  const { fontScale, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [listWidth, setListWidth] = useState(0);
  const stacked = fontScale >= 1.6;
  // Every lateral grid column must retain the scaled 40-point rail before its inner optical gap.
  const availableWidth =
    (listWidth || width - insets.left - insets.right) -
    2 * tokens.spacing.screen;
  const columns = stacked
    ? 1
    : Math.max(2, Math.min(8, Math.floor(availableWidth / (40 * fontScale))));
  const { headerHeight, collapseRange, tabBarHeight } =
    useCollapsingTabsContext();
  const days = useMemo(
    () => (calendar.isError ? [] : calendarDays(calendar.data)),
    [calendar.data, calendar.isError],
  );
  const rows = useMemo(() => calendarRows(days, stacked), [days, stacked]);
  const stickyHeaderIndices = useMemo(
    () => rows.flatMap((row, index) => (row.kind === "date" ? [index] : [])),
    [rows],
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setDisplayZone(currentSportingTimeZone());
    });
    return () => subscription.remove();
  }, []);
  /** First-page retry/refresh replaces traversal; failure presents the shared error card without exposing cached rows. */
  async function refresh() {
    if (refreshing || !active) return;
    setRefreshing(true);
    const nextZone = currentSportingTimeZone();
    try {
      if (nextZone !== zone)
        await client.cancelQueries({ queryKey: options.queryKey, exact: true });
      setZone(nextZone);
      await refreshCalendar(
        client,
        createCalendarOptions(queries, { ...selection, timeZone: nextZone }),
      );
      list.current?.scrollToOffset({ offset: 0, animated: false });
    } catch {
      // Query owns the read failure and its error-card retry; no competing toast or row store is needed.
    } finally {
      setRefreshing(false);
    }
  }
  /** Appends only for the visible idle list; Query does not cancel an in-flight replacement. */
  function loadMore() {
    if (
      active &&
      navigation.isFocused() &&
      calendar.hasNextPage &&
      !refreshing &&
      !calendar.isFetching &&
      !calendar.isError
    )
      void calendar.fetchNextPage({ cancelRefetch: false });
  }
  return (
    <TabLegendList<CalendarRow>
      {...pagedListDefaults}
      // Replace the native grid when its column count changes; Query and RNCT retain their owners.
      key={columns}
      ref={list}
      alwaysBounceVertical
      contentContainerStyle={pageContentStyle}
      data={rows}
      numColumns={columns}
      onLayout={({ nativeEvent }) => setListWidth(nativeEvent.layout.width)}
      overrideItemLayout={(layout, item, _index, columns) => {
        layout.span =
          item.kind === "date" || item.kind === "space"
            ? 1
            : columns === 1
              ? 1
              : columns - 1;
      }}
      recycleItems
      getItemType={(item) => item.kind}
      getFixedItemSize={(item) => (item.kind === "space" ? 0 : undefined)}
      keyExtractor={(item) => item.key}
      stickyHeaderIndices={stickyHeaderIndices}
      stickyHeaderConfig={{
        offset: headerHeight - collapseRange + tabBarHeight,
      }}
      refreshControl={
        <DataRefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          enabled={active}
        />
      }
      renderItem={({ item }) =>
        item.kind === "space" ? null : item.kind === "date" ? (
          <CalendarDate
            date={item.date}
            timeZone={groupingZone}
            stacked={stacked}
          />
        ) : item.kind === "pool" ? (
          <CalendarPoolHeader group={item.group} />
        ) : (
          <CalendarGroupPart match={item.match} last={item.last}>
            <View
              style={[
                styles.match,
                item.first && styles.firstMatch,
                item.last && styles.lastMatch,
              ]}
            >
              <CalendarMatch match={item.match} displayTimeZone={displayZone} />
            </View>
          </CalendarGroupPart>
        )
      }
      onEndReached={() => {
        if (
          calendar.hasNextPage &&
          !calendar.isFetching &&
          !calendar.isFetchNextPageError
        )
          loadMore();
      }}
      ListEmptyComponent={
        <ScreenState>
          {calendar.isPending ? (
            <RequestLoading />
          ) : calendar.isError ? (
            <ErrorState
              onRetry={() => void refresh()}
              retrying={calendar.isFetching}
            />
          ) : (
            <EmptyState title="Aucun match pour cette sélection" />
          )}
        </ScreenState>
      }
      ListFooterComponent={
        calendar.isFetchingNextPage ? <RequestLoading /> : undefined
      }
    />
  );
}

/** Date-only sporting values stay on their original day; the full spoken heading uses the captured zone. */
function CalendarDate({
  date,
  timeZone,
  stacked,
}: {
  date: string;
  timeZone: string;
  stacked: boolean;
}) {
  const { colors } = useTheme();
  const value = new Date(`${date}T12:00:00Z`);
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={formatSportingDay(date, timeZone)}
      style={[
        styles.dateHeading,
        { backgroundColor: colors.canvas },
        stacked && styles.stackedDate,
      ]}
    >
      <Text style={[styles.date, { color: colors.text }]}>
        {dayFormat.format(value)}
      </Text>
      <Text
        style={[styles.dateMeta, { color: colors.secondaryText }]}
      >{`${weekdayFormat.format(value)}\n${monthFormat.format(value)}`}</Text>
    </View>
  );
}

/** Reuses one pool outline across separate header and encounter cells, with rounded ends only. */
function CalendarGroupPart({
  match,
  first,
  last,
  children,
}: PropsWithChildren<{
  match: MatchSummaryResponse;
  first?: boolean;
  last?: boolean;
}>) {
  const { colors } = useTheme();
  const division = match.pool.classification.division;
  return (
    <View
      style={[
        styles.groupPart,
        first && styles.groupStart,
        last && styles.groupEnd,
        {
          backgroundColor: colors.surface,
          borderColor: division
            ? `${division.color}${tokens.sporting.borderAlpha}`
            : colors.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

/** A real pool heading appears once before its individually virtualized accepted encounters. */
function CalendarPoolHeader({ group }: { group: MatchPoolGroupResponse }) {
  const { context } = useTheme();
  const pool = group.matches[0].pool;
  const division = pool.classification.division;
  const accent = division?.color ?? context.primary;
  const foreground = division ? divisionTextColor(accent) : context.onAction;
  return (
    <CalendarGroupPart match={group.matches[0]} first>
      <View style={styles.groupInset}>
        <View style={[styles.pool, { backgroundColor: accent }]}>
          {division && (
            <>
              <DivisionPaint division={division} />
              <SportingArtwork division={division} />
              <SportingLogo identity={division} kind="division" size={40} />
            </>
          )}
          <View style={styles.identity}>
            <Text
              accessibilityRole="header"
              style={[styles.poolName, { color: foreground }]}
            >
              {pool.pool.name}
            </Text>
            <Text style={[styles.metadata, { color: foreground }]}>
              {[division?.name, genderLabel(pool.classification.gender)]
                .filter(Boolean)
                .join(" ")}
            </Text>
            <Text style={[styles.metadata, { color: foreground }]}>
              {group.matches.length} match{group.matches.length > 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </View>
    </CalendarGroupPart>
  );
}

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  day: "numeric",
});
const weekdayFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  weekday: "short",
});
const monthFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  month: "short",
});

const styles = StyleSheet.create({
  dateHeading: { gap: tokens.spacing.xs, paddingRight: tokens.spacing.xs },
  stackedDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
  },
  date: { ...tokens.typography.headingXl },
  dateMeta: { ...tokens.typography.metadata },
  groupPart: {
    borderLeftWidth: tokens.border.thin,
    borderRightWidth: tokens.border.thin,
    overflow: "hidden",
  },
  groupStart: {
    borderTopWidth: tokens.border.thin,
    borderTopLeftRadius: tokens.radius.panel,
    borderTopRightRadius: tokens.radius.panel,
  },
  groupEnd: {
    borderBottomWidth: tokens.border.thin,
    borderBottomLeftRadius: tokens.radius.panel,
    borderBottomRightRadius: tokens.radius.panel,
    marginBottom: tokens.spacing.md,
  },
  groupInset: { padding: tokens.spacing.xs, paddingBottom: 0 },
  pool: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderTopLeftRadius: tokens.radius.panelInset,
    borderTopRightRadius: tokens.radius.panelInset,
    overflow: "hidden",
  },
  identity: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  poolName: { ...tokens.typography.strong },
  metadata: { ...tokens.typography.metadata },
  match: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
  },
  firstMatch: { paddingTop: tokens.spacing.lg },
  lastMatch: { paddingBottom: tokens.spacing.lg },
});
