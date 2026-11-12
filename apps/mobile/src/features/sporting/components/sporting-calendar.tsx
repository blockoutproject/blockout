import { PageList } from "../../../shared/components/page-list";
import {
  PageScrollView,
  PageContent,
  pageContentStyle,
} from "../../../shared/components/page";
import { type LegendListRef } from "@legendapp/list/react-native";
import {
  hashKey,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import { RefreshCw } from "lucide-react-native";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import type {
  MatchCalendarResponse,
  MatchPoolGroupResponse,
  MatchSummaryResponse,
} from "../../../../.generated/schemas/index.zod";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Button } from "../../../shared/components/button";
import { EmptyState } from "../../../shared/components/state-card";
import {
  hasReadError,
  ReadFeedback,
} from "../../../shared/components/read-feedback";
import { CalendarLoading } from "./calendar-loading";
import { useCalendarLayout } from "../hooks/use-calendar-layout";
import { ScreenState } from "../../../shared/components/screen-state";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { calendarDays, type CalendarSelection } from "../api/sporting-calendar";
import { useSportingCalendar } from "../api/use-sporting-calendar";
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
  /** Scene-local controls scroll in the calendar's actual list header; the sporting page owns its shared identity. */
  children?: ReactNode;
}

/**
 * Individually virtualized encounters retain Query's complete days and pool grouping. Native sticky
 * day cells stick inside their own viewport; foreground changes only time formatting.
 */
export function SportingCalendar({
  selection,
  active = true,
  children,
}: Readonly<SportingCalendarProps>) {
  const { calendar, refresh, queryKey } = useSportingCalendar(
    selection,
    active,
  );
  return (
    <SportingCalendarView
      key={hashKey(queryKey)}
      calendar={calendar}
      active={active}
      onRefresh={refresh}
    >
      {children}
    </SportingCalendarView>
  );
}

/** Native calendar read state; validated DTOs and their query lifecycle remain with the caller. */
export interface SportingCalendarViewProps {
  calendar: Pick<
    UseInfiniteQueryResult<InfiniteData<MatchCalendarResponse>, Error>,
    | "data"
    | "isPending"
    | "isError"
    | "errorUpdatedAt"
    | "refetch"
    | "isFetching"
    | "isFetchNextPageError"
    | "isFetchingNextPage"
    | "hasNextPage"
    | "fetchNextPage"
  > & {
    /** Native Query eligibility; an explicit scoped Retry can reread a failed disabled observer. */
    isEnabled?: boolean;
  };
  active?: boolean;
  onRefresh: (timeZone: string) => Promise<unknown>;
  emptyState?: ReactNode;
  /** Optional scene identity remains in the same native scroller as the calendar. */
  children?: ReactNode;
}

/** Keeps complete days/cursors in Query while failed calendar content and controls yield to one scoped Retry card. */
export function SportingCalendarView({
  calendar,
  active = true,
  onRefresh,
  emptyState,
  children,
}: Readonly<SportingCalendarViewProps>) {
  const navigation = useNavigation();
  const [displayZone, setDisplayZone] = useState(currentSportingTimeZone);
  const [refreshing, setRefreshing] = useState(false);
  const list = useRef<LegendListRef>(null);
  const offset = useRef(0);
  const [listWidth, setListWidth] = useState(0);
  const { stacked, columns } = useCalendarLayout(listWidth);
  const days = useMemo(() => calendarDays(calendar.data), [calendar.data]);
  const rows = useMemo(() => calendarRows(days, stacked), [days, stacked]);
  const stickyHeaderIndices = useMemo(
    () => rows.flatMap((row, index) => (row.kind === "date" ? [index] : [])),
    [rows],
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setDisplayZone(currentSportingTimeZone());
      }
    });
    return () => subscription.remove();
  }, []);

  /** Explicit refresh chooses the current zone; Query owns failure and the native control owns pull progress. */
  async function refresh() {
    if (refreshing || !active || !navigation.isFocused()) {
      return;
    }
    setRefreshing(true);
    try {
      await onRefresh(currentSportingTimeZone());
      offset.current = 0;
      list.current?.scrollToOffset({ offset: 0, animated: false });
    } catch {
      // The existing Query result renders the final read failure in this pane.
    } finally {
      setRefreshing(false);
    }
  }

  /** A card resumes its failed cursor or rereads the same traversal, without changing its loading zone. */
  async function retry() {
    if (!active || !navigation.isFocused()) {
      return;
    }
    if (calendar.isFetchNextPageError) {
      await calendar.fetchNextPage({ cancelRefetch: false });
    } else {
      await calendar.refetch({ cancelRefetch: false });
    }
  }

  /** Only an active idle successful traversal may request its server-owned continuation automatically. */
  async function loadMore() {
    if (
      active &&
      navigation.isFocused() &&
      calendar.hasNextPage &&
      !refreshing &&
      !calendar.isFetching &&
      !calendar.isError
    ) {
      await calendar.fetchNextPage({ cancelRefetch: false });
    }
  }

  if (hasReadError(calendar)) {
    return (
      <PageScrollView>
        <ScreenState>
          <ReadFeedback
            query={calendar}
            failed
            loadingContent={null}
            onRetry={retry}
          />
        </ScreenState>
      </PageScrollView>
    );
  }

  const refreshControl =
    rows.length > 0 ? (
      <DataRefreshControl
        onRefresh={refresh}
        enabled={active}
        fetching={calendar.isFetching}
      />
    ) : undefined;
  if (rows.length === 0) {
    return (
      <PageScrollView refreshControl={refreshControl}>
        {calendar.isPending &&
        calendar.isFetching &&
        calendar.isEnabled !== false ? (
          <PageContent>
            {children}
            <CalendarLoading columns={columns} stacked={stacked} />
          </PageContent>
        ) : (
          <>
            {children && (
              <PageContent style={styles.stateControls}>{children}</PageContent>
            )}
            <ScreenState>
              {!calendar.isPending &&
                (emptyState ?? (
                  <EmptyState title="Aucun match pour cette sélection">
                    <Button
                      label="Actualiser"
                      leadingIcon={RefreshCw}
                      onPress={() => void refresh()}
                      loading={refreshing && calendar.isFetching}
                      disabled={!active}
                    />
                  </EmptyState>
                ))}
            </ScreenState>
          </>
        )}
      </PageScrollView>
    );
  }
  return (
    <PageList<CalendarRow>
      {...hiddenScrollIndicators}
      // Replace the native grid when its column count changes; Query retains the traversal.
      key={columns}
      ref={list}
      alwaysBounceVertical
      contentContainerStyle={pageContentStyle}
      data={rows}
      onScroll={({ nativeEvent }) => {
        offset.current = nativeEvent.contentOffset.y;
      }}
      onLoad={() => {
        if (offset.current > 0) {
          void list.current?.scrollToOffset({
            offset: offset.current,
            animated: false,
          });
        }
      }}
      // Re-evaluate retained cells after travel without replacing their grouping or viewport.
      extraData={displayZone}
      numColumns={columns}
      onLayout={({ nativeEvent }) => setListWidth(nativeEvent.layout.width)}
      overrideItemLayout={(layout, item, _index, columns) => {
        const singleSpan =
          item.kind === "date" || item.kind === "space" || columns === 1;
        layout.span = singleSpan ? 1 : columns - 1;
      }}
      recycleItems
      getItemType={(item) => item.kind}
      getFixedItemSize={(item) => (item.kind === "space" ? 0 : undefined)}
      keyExtractor={(item) => item.key}
      stickyHeaderIndices={stickyHeaderIndices}
      ListHeaderComponent={
        children ? (
          <View style={styles.sceneHeader}>{children}</View>
        ) : undefined
      }
      refreshControl={refreshControl}
      renderItem={({ item }) => {
        if (item.kind === "space") {
          return null;
        }
        if (item.kind === "date") {
          return <CalendarDate date={item.date} stacked={stacked} />;
        }
        if (item.kind === "pool") {
          return <CalendarPoolHeader group={item.group} />;
        }
        return (
          <CalendarGroupPart match={item.match} last={item.last}>
            <View
              style={[
                styles.match,
                item.first && styles.firstMatch,
                item.last && styles.lastMatch,
              ]}
            >
              <CalendarMatch
                key={item.match.id}
                match={item.match}
                displayTimeZone={displayZone}
                active={active}
              />
            </View>
          </CalendarGroupPart>
        );
      }}
      onEndReached={() => void loadMore()}
      ListFooterComponent={
        <>
          <ListContinuation
            loading={calendar.isFetchingNextPage}
            failed={false}
            onRetry={loadMore}
          />
          <BottomContentSpacer />
        </>
      }
    />
  );
}

/** The full spoken heading retains the server-grouped civil day without a relative prefix. */
function CalendarDate({
  date,
  stacked,
}: Readonly<{ date: string; stacked: boolean }>) {
  const { colors } = useTheme();
  const value = new Date(`${date}T12:00:00Z`);
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={formatSportingDay(date)}
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
}: Readonly<
  PropsWithChildren<{
    match: MatchSummaryResponse;
    first?: boolean;
    last?: boolean;
  }>
>) {
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
function CalendarPoolHeader({
  group,
}: Readonly<{ group: MatchPoolGroupResponse }>) {
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
  stateControls: { paddingBottom: 0 },
  sceneHeader: { gap: tokens.spacing.lg, marginBottom: tokens.spacing.lg },
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
