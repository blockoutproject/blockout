import { PageList } from "@/shared/components/page-list";
import {
  PageScrollView,
  pageContentStyle,
  usePageCanvasBacking,
} from "@/shared/components/page";
import { type LegendListRef } from "@legendapp/list/react-native";
import {
  hashKey,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import { ChevronRight, RefreshCw } from "lucide-react-native";
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
  MatchSummaryResponse,
} from "../../../../.generated/schemas/index.zod";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { Button } from "@/shared/components/button";
import { EmptyState } from "@/shared/components/state-card";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { CalendarLoading } from "./calendar-loading";
import { calendarStyles } from "./calendar-styles";
import { useCalendarLayout } from "../hooks/use-calendar-layout";
import { ScreenState } from "@/shared/components/screen-state";
import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { ListContinuation } from "@/shared/components/list-continuation";
import {
  ContentRevealBlock,
  useContentReveal,
  type ContentReveal,
} from "@/shared/components/content-reveal";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { calendarDays, type CalendarSelection } from "../api/sporting-calendar";
import { useSportingCalendar } from "../api/use-sporting-calendar";
import { calendarRows, type CalendarRow } from "../model/calendar-rows";
import {
  currentSportingTimeZone,
  formatSportingDay,
} from "../model/sporting-time";
import { genderLabel } from "../classification-presentation";
import { SportingLink } from "../link";

import { CalendarMatch } from "./calendar-match";
import { SportingLogo } from "./sporting-identity";
import { SportingMedia } from "./sporting-media";

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
  const { calendar, timeZone, setTimeZone, queryKey } = useSportingCalendar(
    selection,
    active,
  );
  return (
    <SportingCalendarView
      queryKey={queryKey}
      calendar={calendar}
      category={selection.category}
      currentPoolId={selection.poolId}
      active={active}
      timeZone={timeZone}
      onTimeZoneChange={setTimeZone}
    >
      {children}
    </SportingCalendarView>
  );
}

/** Native calendar read state; validated DTOs and their query lifecycle remain with the caller. */
export interface SportingCalendarViewProps {
  queryKey: QueryKey;
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
  /** The loading structure is known from the selected calendar before any matches arrive. */
  category: CalendarSelection["category"];
  /** The open Pool's own calendar already represents this destination. */
  currentPoolId?: string;
  active?: boolean;
  timeZone: string;
  onTimeZoneChange: (timeZone: string) => void;
  emptyState?: ReactNode;
  /** Optional scene identity remains in the same native scroller as the calendar. */
  children?: ReactNode;
}

function calendarRevealKey(row: CalendarRow) {
  return row.kind === "space" ? undefined : row.groupKey;
}

/** Keeps the native calendar mounted during continuation; other read failures retain their scoped card. */
export function SportingCalendarView(
  props: Readonly<SportingCalendarViewProps>,
) {
  const reveal = useContentReveal(props.active ?? true);
  return (
    <CalendarViewport
      key={hashKey(props.queryKey)}
      {...props}
      reveal={reveal}
    />
  );
}

function CalendarViewport({
  queryKey,
  calendar,
  category,
  currentPoolId,
  active = true,
  timeZone,
  onTimeZoneChange,
  emptyState,
  children,
  reveal,
}: Readonly<
  SportingCalendarViewProps & {
    reveal: ContentReveal;
  }
>) {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
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

  async function refresh() {
    if (refreshing || !active || !navigation.isFocused()) {
      return;
    }
    const nextZone = currentSportingTimeZone();
    if (nextZone !== timeZone) {
      onTimeZoneChange(nextZone);
      return;
    }

    setRefreshing(true);
    try {
      // Refetch rereads the retained traversal and supersedes a continuation in flight.
      await calendar.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  /** A card rereads the same traversal without changing its loading zone. */
  async function retry() {
    if (!active || !navigation.isFocused()) {
      return;
    }
    await calendar.refetch({ cancelRefetch: false });
  }

  async function loadMore() {
    if (
      !active ||
      !navigation.isFocused() ||
      refreshing ||
      calendar.isFetching ||
      !calendar.hasNextPage
    ) {
      return;
    }
    await calendar.fetchNextPage({ cancelRefetch: false });
  }

  // A full pull retains the continuation's previous Query error until its new read settles.
  if (
    hasReadError(calendar) &&
    (!calendar.data || (!calendar.isFetchNextPageError && !refreshing))
  ) {
    return (
      <PageScrollView>
        <ScreenState>
          <ReadFeedback
            query={calendar}
            loadingContent={null}
            onRetry={retry}
          />
        </ScreenState>
      </PageScrollView>
    );
  }

  const showRows = rows.length > 0 || calendar.hasNextPage;
  const loading =
    !showRows &&
    calendar.isPending &&
    calendar.isFetching &&
    calendar.isEnabled !== false;
  const emptyContent =
    !showRows && !calendar.isPending ? (
      <ScreenState
        style={[styles.listState, !!children && styles.stateAfterHeader]}
      >
        {emptyState ?? (
          <EmptyState title="Aucun match pour cette sélection">
            <Button
              label="Actualiser"
              leadingIcon={RefreshCw}
              onPress={() => void refresh()}
              loading={refreshing && calendar.isFetching}
              disabled={!active}
            />
          </EmptyState>
        )}
      </ScreenState>
    ) : null;
  return (
    <PageList<CalendarRow>
      // Replace the native grid when its column count changes; Query retains the traversal.
      key={columns}
      ref={list}
      alwaysBounceVertical={showRows}
      bounces={rows.length > 0}
      contentContainerStyle={pageContentStyle}
      data={rows}
      maintainVisibleContentPosition
      onScroll={({ nativeEvent }) => {
        if (showRows) {
          offset.current = nativeEvent.contentOffset.y;
        }
      }}
      onLoad={() => {
        if (offset.current > 0) {
          void list.current?.scrollToOffset({
            offset: offset.current,
            animated: false,
          });
        }
      }}
      reveal={{ blockKey: calendarRevealKey, presentation: reveal }}
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
      getItemType={(item) =>
        item.kind === "match" && item.first ? "matchWithPool" : item.kind
      }
      getFixedItemSize={(item) => (item.kind === "space" ? 0 : undefined)}
      keyExtractor={(item) => item.key}
      stickyHeaderIndices={stickyHeaderIndices}
      ListHeaderComponent={
        children ? (
          <View style={styles.sceneHeader}>{children}</View>
        ) : undefined
      }
      ListEmptyComponent={emptyContent}
      loadingFeedback={{
        active: loading,
        content: (
          <CalendarLoading
            category={category}
            columns={columns}
            stacked={stacked}
          />
        ),
      }}
      refreshControl={
        <DataRefreshControl
          onRefresh={refresh}
          enabled={active && rows.length > 0}
          fetching={() =>
            queryClient.getQueryState(queryKey)?.fetchStatus === "fetching"
          }
        />
      }
      renderItem={({ item }) => {
        if (item.kind === "space") {
          return null;
        }
        if (item.kind === "date") {
          return <CalendarDate row={item} stacked={stacked} reveal={reveal} />;
        }
        const match = (
          <View
            style={[
              calendarStyles.matchInset,
              item.first && calendarStyles.firstMatch,
              item.last && calendarStyles.lastMatch,
            ]}
          >
            <CalendarMatch
              key={item.match.id}
              match={item.match}
              displayTimeZone={displayZone}
              active={active}
            />
          </View>
        );
        return item.first ? (
          <CalendarPoolGroupStart
            pool={item.match.pool}
            linked={
              item.match.pool.pool.id.toLowerCase() !==
              currentPoolId?.toLowerCase()
            }
            active={active}
            last={item.last}
          >
            {match}
          </CalendarPoolGroupStart>
        ) : (
          <CalendarGroupPart
            divisionColor={item.match.pool.classification.division?.color}
            last={item.last}
          >
            {match}
          </CalendarGroupPart>
        );
      }}
      onEndReached={() => {
        if (!calendar.isError) {
          void loadMore();
        }
      }}
      ListFooterComponent={
        <>
          {showRows && (
            <ListContinuation
              loading={calendar.isFetchingNextPage}
              failed={
                !refreshing &&
                calendar.hasNextPage &&
                calendar.isFetchNextPageError
              }
              disabled={!active || refreshing || calendar.isFetching}
              onRetry={() => void loadMore()}
            />
          )}
          <BottomContentSpacer />
        </>
      }
    />
  );
}

/** The full spoken heading retains the server-grouped civil day without a relative prefix. */
function CalendarDate({
  row: { date, groupKey },
  stacked,
  reveal,
}: Readonly<{
  row: Extract<CalendarRow, { kind: "date" }>;
  stacked: boolean;
  reveal: ContentReveal;
}>) {
  const { colors } = useTheme();
  const backgroundColor = usePageCanvasBacking();
  const value = new Date(`${date}T12:00:00Z`);
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={formatSportingDay(date)}
      style={[{ backgroundColor }, !stacked && styles.lateralDate]}
    >
      <ContentRevealBlock
        reveal={reveal}
        blockKey={groupKey}
        style={[
          calendarStyles.dateHeading,
          stacked && calendarStyles.stackedDate,
        ]}
      >
        <Text style={[styles.date, { color: colors.text }]}>
          {dayFormat.format(value)}
        </Text>
        <Text
          style={[styles.dateMeta, { color: colors.secondaryText }]}
        >{`${weekdayFormat.format(value)}\n${monthFormat.format(value)}`}</Text>
      </ContentRevealBlock>
    </View>
  );
}

/** Extends the shadow past each interior join, where the cell clips it to a continuous side edge. */
function CalendarGroupPart({
  divisionColor,
  first,
  last,
  children,
}: Readonly<
  PropsWithChildren<{
    divisionColor?: string;
    first?: boolean;
    last?: boolean;
  }>
>) {
  const { colors } = useTheme();
  const tint =
    divisionColor && `${divisionColor}${colors.calendarPoolSurfaceAlpha}`;
  const startAlpha = first
    ? colors.calendarPoolHeaderAlpha
    : colors.calendarPoolSurfaceAlpha;
  return (
    <View
      style={[
        styles.groupClip,
        first && styles.groupClipStart,
        last && styles.groupClipEnd,
      ]}
    >
      <View
        style={[
          styles.groupPart,
          first ? styles.groupStart : styles.groupContinueAbove,
          last ? styles.groupEnd : styles.groupContinueBelow,
          {
            backgroundColor: colors.surface,
            backgroundImage: tint
              ? `linear-gradient(${divisionColor}${startAlpha}, ${tint} 60%)`
              : undefined,
            borderColor: divisionColor
              ? `${divisionColor}${colors.contextBorderAlpha}`
              : colors.border,
            boxShadow: colors.cardShadow,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/** A group's first virtual cell clips the shared halo behind its heading and first match. */
function CalendarPoolGroupStart({
  pool,
  linked,
  active,
  last,
  children,
}: Readonly<
  PropsWithChildren<{
    pool: MatchSummaryResponse["pool"];
    linked: boolean;
    active: boolean;
    last: boolean;
  }>
>) {
  const { colors } = useTheme();
  const division = pool.classification.division;
  const metadata = [division?.name, genderLabel(pool.classification.gender)]
    .filter(Boolean)
    .join(" ");

  function renderGroup(logo: ReactNode, atmosphere?: ReactNode) {
    const heading = (
      <>
        {atmosphere}
        {logo}
        <View style={calendarStyles.poolCopy}>
          <Text
            accessibilityRole="header"
            accessibilityLabel={pool.pool.name}
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[styles.poolName, { color: colors.text }]}
          >
            {pool.pool.name}
          </Text>
          <Text style={[styles.metadata, { color: colors.secondaryText }]}>
            {metadata}
          </Text>
        </View>
      </>
    );
    return (
      <CalendarGroupPart divisionColor={division?.color} first last={last}>
        {linked ? (
          <SportingLink
            kind="pool"
            id={pool.pool.id}
            label={
              metadata ? `${pool.pool.name} - ${metadata}` : pool.pool.name
            }
            active={active}
            style={calendarStyles.poolHeading}
          >
            {heading}
            <ChevronRight
              accessible={false}
              size={tokens.size.icon.sm}
              color={colors.icon}
            />
          </SportingLink>
        ) : (
          <View style={calendarStyles.poolHeading}>{heading}</View>
        )}
        {children}
      </CalendarGroupPart>
    );
  }

  return division ? (
    <SportingLogo
      identity={division}
      kind="division"
      renderWithAtmosphere={renderGroup}
    />
  ) : (
    renderGroup(<SportingMedia identity={pool.pool} kind="division" />)
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

const groupShadowGutter = tokens.elevation.cardShadowBlurRadius;
const groupShadowOverlap = 2 * groupShadowGutter;

const styles = StyleSheet.create({
  listState: { padding: 0, paddingTop: tokens.spacing.sm },
  stateAfterHeader: { paddingTop: 0 },
  sceneHeader: { gap: tokens.spacing.lg, marginBottom: tokens.spacing.lg },
  date: { ...tokens.typography.headingXl },
  dateMeta: { ...tokens.typography.metadata },
  // Keep the opaque date backing clear of the adjacent card shadow.
  lateralDate: { alignSelf: "flex-start" },
  groupClip: {
    overflow: "hidden",
    marginHorizontal: -groupShadowGutter,
    paddingHorizontal: groupShadowGutter,
  },
  groupClipStart: {
    marginTop: -groupShadowGutter,
    paddingTop: groupShadowGutter,
  },
  groupClipEnd: { paddingBottom: tokens.layout.list.gap },
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
  },
  groupContinueAbove: {
    marginTop: -groupShadowOverlap,
    paddingTop: groupShadowOverlap,
  },
  groupContinueBelow: {
    marginBottom: -groupShadowOverlap,
    paddingBottom: groupShadowOverlap,
  },
  poolName: { ...tokens.typography.strong },
  metadata: { ...tokens.typography.metadata },
});
