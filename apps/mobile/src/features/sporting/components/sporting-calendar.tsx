import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AppState,
  FlatList,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type {
  CalendarCategoryEnum,
  MatchDayResponse,
  MatchPoolGroupResponse,
} from "../../../../.generated/schemas/index.zod";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { pageContentStyle } from "../../../shared/components/page";
import { tokens } from "../../../shared/theme/tokens";
import { useReducedMotion } from "../../../shared/theme/use-reduced-motion";
import { useTheme } from "../../../shared/theme/theme-provider";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { resourceUnavailable } from "../model/consultation-availability";
import {
  createCalendarOptions,
  refreshCalendar,
  calendarDays,
  type CalendarSelection,
} from "../api/sporting-calendar";
import { useConsultationQueries } from "../api/use-consultation-queries";
import {
  currentSportingTimeZone,
  formatSportingDay,
} from "../model/sporting-time";
import { divisionTextColor } from "../presentation";
import { genderLabel } from "../classification-presentation";
import { CalendarMatch } from "./calendar-match";
import { MatchSurface } from "./match-surface";
import { DivisionPaint } from "./division-paint";
import { SportingLogo, SportingArtwork } from "./sporting-identity";

/** Active resource tab with ordinary native list header; its selector never contains continuation. */
export interface SportingCalendarProps {
  selection: Omit<CalendarSelection, "timeZone">;
  header?: ReactNode;
  toolbar?: ReactNode;
  active?: boolean;
}

/** One flattened pool group retains its complete day and original server order. */
interface CalendarGroup {
  day: MatchDayResponse;
  pool: MatchPoolGroupResponse;
  first: boolean;
}

/** The first native list cell carries the sticky tab rail; remaining cells are complete pool groups. */
type CalendarRow = { kind: "toolbar" } | ({ kind: "group" } & CalendarGroup);

/**
 * Virtualized day/pool groups retain Query's pages while native navigation keeps the page alive.
 * Foreground updates formatting only. Only successful explicit refresh changes grouping/progression.
 */
export function SportingCalendar({
  selection,
  header,
  toolbar,
  active = true,
}: SportingCalendarProps) {
  const queries = useConsultationQueries();
  const client = useQueryClient();
  const feedback = useActionFeedback();
  const [zone, setZone] = useState(currentSportingTimeZone);
  const [displayZone, setDisplayZone] = useState(currentSportingTimeZone);
  const [refreshing, setRefreshing] = useState(false);
  const list = useRef<FlatList<CalendarRow>>(null);
  const options = createCalendarOptions(queries, {
    ...selection,
    timeZone: zone,
  });
  const calendar = useInfiniteQuery({ ...options, enabled: active });
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const days = calendarDays(calendar.data);
  const groups: CalendarRow[] = [
    ...(toolbar ? [{ kind: "toolbar" as const }] : []),
    ...days.flatMap((day) =>
      day.pools.map((pool, index) => ({
        kind: "group" as const,
        day,
        pool,
        first: index === 0,
      })),
    ),
  ];
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setDisplayZone(currentSportingTimeZone());
    });
    return () => subscription.remove();
  }, []);
  /** Native Query first-page replacement is atomic; a new phone zone becomes active only on success. */
  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    const nextZone = currentSportingTimeZone();
    try {
      if (nextZone !== zone)
        await client.cancelQueries({ queryKey: options.queryKey, exact: true });
      await refreshCalendar(
        client,
        createCalendarOptions(queries, { ...selection, timeZone: nextZone }),
      );
      setZone(nextZone);
      list.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (error) {
      if (error instanceof Error && resourceUnavailable(error)) {
        client
          .getQueryCache()
          .find({ queryKey: options.queryKey, exact: true })
          ?.setState({
            data: undefined,
            dataUpdatedAt: 0,
            error,
            status: "error",
          });
      }
      if (calendar.data && !isAccessDenied(error)) feedback.error();
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <FlatList
      ref={list}
      alwaysBounceVertical
      contentContainerStyle={pageContentStyle}
      data={groups}
      keyExtractor={(item) =>
        item.kind === "toolbar"
          ? "toolbar"
          : `${item.day.date}:${item.pool.poolId}`
      }
      stickyHeaderIndices={toolbar ? [header ? 1 : 0] : undefined}
      ListHeaderComponent={
        header ? <View style={styles.header}>{header}</View> : undefined
      }
      refreshControl={
        <DataRefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
        />
      }
      renderItem={({ item }) =>
        item.kind === "toolbar" ? (
          <View style={[styles.toolbar, { backgroundColor: colors.canvas }]}>
            {toolbar}
          </View>
        ) : (
          <View
            style={[
              styles.day,
              item.first && styles.newDay,
              fontScale >= 1.6 && styles.stacked,
            ]}
          >
            <View style={fontScale >= 1.6 ? styles.stackedDate : styles.rail}>
              {item.first && (
                <Text
                  accessibilityRole="header"
                  accessibilityLabel={formatSportingDay(item.day.date, zone)}
                  style={[styles.date, { color: colors.text }]}
                >
                  {new Intl.DateTimeFormat("fr-FR", {
                    timeZone: "UTC",
                    day: "numeric",
                  }).format(new Date(`${item.day.date}T12:00:00Z`))}
                  <Text
                    style={[styles.dateMeta, { color: colors.secondaryText }]}
                  >{`\n${new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short" }).format(new Date(`${item.day.date}T12:00:00Z`))}\n${new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "short" }).format(new Date(`${item.day.date}T12:00:00Z`))}`}</Text>
                </Text>
              )}
            </View>
            <View style={styles.group}>
              <CalendarPoolGroup
                group={item.pool}
                displayTimeZone={displayZone}
              />
            </View>
          </View>
        )
      }
      onEndReached={() => {
        if (
          calendar.hasNextPage &&
          !calendar.isFetching &&
          !calendar.isFetchNextPageError
        )
          void calendar.fetchNextPage();
      }}
      ListFooterComponent={
        !days.length ? (
          calendar.isPending ? (
            <RequestLoading />
          ) : calendar.isError ? (
            <ErrorState
              onRetry={() => void refresh()}
              retrying={calendar.isFetching}
            />
          ) : (
            <EmptyState title="Aucun match pour cette sélection" />
          )
        ) : calendar.isFetchingNextPage ? (
          <RequestLoading />
        ) : calendar.isFetchNextPageError ? (
          <ErrorState
            onRetry={() => void calendar.fetchNextPage()}
            retrying={calendar.isFetching}
          />
        ) : calendar.hasNextPage ? (
          <Button
            variant="secondary"
            label="Charger les journées suivantes"
            onPress={() => void calendar.fetchNextPage()}
          />
        ) : undefined
      }
    />
  );
}

/** A real pool heading and its exact accepted rows; no locally inferred score or pool navigation. */
function CalendarPoolGroup({
  group,
  displayTimeZone,
}: {
  group: MatchPoolGroupResponse;
  displayTimeZone: string;
}) {
  const { colors, context } = useTheme();
  const pool = group.matches[0].pool;
  const division = pool.classification.division;
  const accent = division?.color ?? context.primary;
  const foreground = division ? divisionTextColor(accent) : context.onAction;
  return (
    <MatchSurface division={division}>
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
        <View style={[styles.matches, { backgroundColor: colors.surface }]}>
          {group.matches.map((match) => (
            <CalendarMatch
              key={match.id}
              match={match}
              displayTimeZone={displayTimeZone}
            />
          ))}
        </View>
      </View>
    </MatchSurface>
  );
}

/** Resource-owned tab selection and shared header; only visited categories acquire a Query observer. */
export interface SportingCalendarsProps {
  category?: CalendarCategoryEnum;
  selector: Omit<CalendarSelection, "category" | "timeZone">;
  header: ReactNode;
  toolbar: ReactNode;
  onSelect: (category: CalendarCategoryEnum) => void;
}

/** Native paging keeps lazily opened categories mounted, retaining their loading zone and scroll. */
export function SportingCalendars({
  category,
  selector,
  header,
  toolbar,
  onSelect,
}: SportingCalendarsProps) {
  const [visited, setVisited] = useState<CalendarCategoryEnum[]>([]);
  const pager = useRef<ScrollViewInstance>(null);
  const dimensions = useWindowDimensions();
  const [width, setWidth] = useState(dimensions.width);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (category)
      pager.current?.scrollTo({
        x: category === "upcoming" ? 0 : width,
        animated: !reducedMotion,
      });
  }, [category, width, reducedMotion]);
  if (category && !visited.includes(category))
    setVisited([...visited, category]);
  return (
    <View
      style={category ? styles.visible : styles.hidden}
      onLayout={(event) => {
        if (event.nativeEvent.layout.width > 0)
          setWidth(event.nativeEvent.layout.width);
      }}
    >
      <ScrollView
        ref={pager}
        style={styles.visible}
        testID="sporting-calendar-pager"
        horizontal
        pagingEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          if (category)
            onSelect(
              event.nativeEvent.contentOffset.x /
                event.nativeEvent.layoutMeasurement.width <
                0.5
                ? "upcoming"
                : "completed",
            );
        }}
      >
        {(["upcoming", "completed"] as const).map((value) => (
          <View
            key={value}
            style={[styles.pagerPage, { width }]}
            accessibilityElementsHidden={category !== value}
            importantForAccessibility={
              category === value ? "auto" : "no-hide-descendants"
            }
          >
            {visited.includes(value) && (
              <SportingCalendar
                selection={{ ...selector, category: value }}
                header={header}
                toolbar={toolbar}
                active={category === value}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  visible: { flex: 1 },
  pagerPage: { height: "100%", flexShrink: 0 },
  hidden: { display: "none" },
  header: { gap: tokens.spacing.lg, marginBottom: tokens.spacing.lg },
  toolbar: { gap: tokens.spacing.md, paddingVertical: tokens.spacing.sm },
  day: {
    flexDirection: "row",
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  newDay: { marginTop: tokens.spacing.md },
  rail: { width: 32 },
  stacked: { flexDirection: "column" },
  stackedDate: { alignSelf: "flex-start" },
  date: { ...tokens.typography.heading },
  dateMeta: { ...tokens.typography.metadata },
  group: { flex: 1, minWidth: 0 },
  groupInset: { padding: tokens.spacing.xs },
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
  matches: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
});
