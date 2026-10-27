import { memo, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
  type RefreshControlProps,
  type SectionListProps,
} from "react-native";
import { MaterialTabBar, Tabs } from "react-native-collapsible-tab-view";
import {
  DefaultTabBar,
  Tabs as LegendTabs,
  useCollapsingTabsContext,
} from "react-native-collapsible-tab";
import { TabLegendList } from "react-native-collapsible-tab/legend-list";
import { TabBar, TabBarIndicator, TabView } from "react-native-tab-view";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import {
  appearanceColors,
  membershipColors,
  tokens,
} from "../shared/theme/tokens";
import type { DemoMatch } from "./tab-view-fixtures";
import { useDemoCalendar, type DemoCalendarState } from "./use-demo-calendar";

const minimumHeaderHeight = 56;

const routes = [
  { key: "upcoming", title: "À venir" },
  { key: "completed", title: "Terminés" },
  { key: "standings", title: "Classement" },
  { key: "empty", title: "Vide" },
];

/** Reads existing semantic and membership roles without requiring any application provider. */
function useDemoTheme() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return {
    colors: appearanceColors[scheme],
    membership: membershipColors[scheme],
  };
}

/**
 * Isolated native library comparison with fictional content. Switching mode remounts its four pages;
 * each library alone owns its pager, indicator and scroll behavior. The host owns safe-area insets.
 */
export function TabViewExamplesScreen() {
  const [mode, setMode] = useState<"standard" | "collapsible" | "legend">(
    "standard",
  );
  const { colors } = useDemoTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={styles.instructions}>
        <Text
          accessibilityRole="header"
          style={[tokens.typography.heading, { color: colors.text }]}
        >
          Essai natif des onglets
        </Text>
        <View style={styles.modeButtons}>
          {(["standard", "collapsible", "legend"] as const).map((item) => (
            <DemoButton
              key={item}
              label={
                item === "standard"
                  ? "TabView fixe"
                  : item === "collapsible"
                    ? "Header rétractable"
                    : "LegendList"
              }
              selected={mode === item}
              onPress={() => setMode(item)}
            />
          ))}
        </View>
        <Text style={[tokens.typography.metadata, { color: colors.text }]}>
          Dates : en-têtes horizontaux natifs. Le rail latéral sticky du
          prototype n’est pas reproduit ici. Changer de mode réinitialise les
          pages.
        </Text>
      </View>
      {mode === "standard" ? (
        <StandardTabs />
      ) : mode === "collapsible" ? (
        <CollapsibleTabs />
      ) : (
        <LegendListTabs />
      )}
    </View>
  );
}

/** Uses a native button for mode, progressive loading and the explicit full-volume action. */
function DemoButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const { colors } = useDemoTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        {
          borderColor: colors.border,
          backgroundColor: selected ? colors.inverse : colors.surface,
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <Text
        style={[
          tokens.typography.label,
          {
            color: selected ? colors.onInverse : colors.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Keeps the header fixed; the stock indicator takes the committed tab's width without scaling its corners. */
function StandardTabs() {
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();
  const { colors, membership } = useDemoTheme();
  return (
    <View style={styles.screen}>
      <DemoHeader />
      <TabView
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        initialLayout={{ width }}
        commonOptions={{ labelStyle: styles.tabLabel }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            scrollEnabled
            activeColor={membership.content}
            inactiveColor={colors.secondaryText}
            style={{ backgroundColor: colors.canvas }}
            gap={tokens.spacing.md}
            tabStyle={styles.tabItem}
            contentContainerStyle={styles.tabRail}
            indicatorStyle={[
              styles.tabIndicator,
              { backgroundColor: membership.fill },
            ]}
            renderIndicator={(indicatorProps) => (
              <TabBarIndicator
                {...indicatorProps}
                style={[
                  indicatorProps.style,
                  {
                    width: indicatorProps.getTabWidth(
                      indicatorProps.navigationState.index,
                    ),
                  },
                ]}
              />
            )}
          />
        )}
        renderScene={({ route }) =>
          route.key === "upcoming" || route.key === "completed" ? (
            <DemoCalendar
              completed={route.key === "completed"}
              collapsible={false}
            />
          ) : (
            <ScrollView contentContainerStyle={styles.shortContent}>
              <ShortContent empty={route.key === "empty"} />
            </ScrollView>
          )
        }
      />
    </View>
  );
}

/** Uses only the collapsible library's container, tab bar and coordinated scrollable components. */
function CollapsibleTabs() {
  const { colors, membership } = useDemoTheme();
  return (
    <Tabs.Container
      containerStyle={styles.pager}
      headerHeight={180}
      minHeaderHeight={minimumHeaderHeight}
      renderHeader={() => <DemoHeader />}
      renderTabBar={(props) => (
        <MaterialTabBar
          {...props}
          scrollEnabled
          activeColor={membership.content}
          inactiveColor={colors.secondaryText}
          style={{ backgroundColor: colors.canvas }}
          tabStyle={[styles.tabItem, styles.materialTabItem]}
          labelStyle={styles.tabLabel}
          contentContainerStyle={[styles.tabRail, { gap: tokens.spacing.md }]}
          indicatorStyle={[
            styles.tabIndicator,
            { backgroundColor: membership.fill },
          ]}
        />
      )}
    >
      <Tabs.Tab name="upcoming" label="À venir">
        <DemoCalendar completed={false} collapsible />
      </Tabs.Tab>
      <Tabs.Tab name="completed" label="Terminés">
        <DemoCalendar completed collapsible />
      </Tabs.Tab>
      <Tabs.Tab name="standings" label="Classement">
        <Tabs.ScrollView contentContainerStyle={styles.shortContent}>
          <ShortContent empty={false} />
        </Tabs.ScrollView>
      </Tabs.Tab>
      <Tabs.Tab name="empty" label="Vide">
        <Tabs.ScrollView contentContainerStyle={styles.shortContent}>
          <ShortContent empty />
        </Tabs.ScrollView>
      </Tabs.Tab>
    </Tabs.Container>
  );
}

/** Tests RNCT's stock LegendList adapter and tab bar without changing either established mode. */
function LegendListTabs() {
  const { colors, membership } = useDemoTheme();
  return (
    <LegendTabs.Container
      containerStyle={styles.pager}
      minHeaderHeight={minimumHeaderHeight}
      headerBackgroundColor={colors.canvas}
      renderHeader={() => <DemoHeader />}
      renderTabBar={(props) => (
        <DefaultTabBar
          {...props}
          backgroundColor={colors.canvas}
          activeColor={membership.content}
          inactiveColor={colors.secondaryText}
          indicatorColor={membership.fill}
          tabStyle={[styles.tabItem, styles.legendTabItem]}
          labelStyle={[styles.tabLabel, { fontWeight: "normal" }]}
          indicatorStyle={styles.tabIndicator}
          renderLabel={({ label, index }) => (
            <DemoAnimatedTabLabel
              label={label}
              index={index}
              position={props.indexDecimal}
            />
          )}
        />
      )}
    >
      <LegendTabs.Tab name="upcoming" label="À venir">
        <LegendCalendar completed={false} />
      </LegendTabs.Tab>
      <LegendTabs.Tab name="completed" label="Terminés">
        <LegendCalendar completed />
      </LegendTabs.Tab>
      <LegendTabs.Tab name="standings" label="Classement">
        <LegendTabs.ScrollView contentContainerStyle={styles.shortContent}>
          <ShortContent empty={false} />
        </LegendTabs.ScrollView>
      </LegendTabs.Tab>
      <LegendTabs.Tab name="empty" label="Vide">
        <LegendTabs.ScrollView contentContainerStyle={styles.shortContent}>
          <ShortContent empty />
        </LegendTabs.ScrollView>
      </LegendTabs.Tab>
    </LegendTabs.Container>
  );
}

/** Follows the stock pager's continuous position; no independent animation or tab state is introduced. */
export function DemoAnimatedTabLabel({
  label,
  index,
  position,
}: {
  label: string;
  index: number;
  position: SharedValue<number>;
}) {
  const { colors, membership } = useDemoTheme();
  const colorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      Math.min(1, Math.abs(position.value - index)),
      [0, 1],
      [membership.content, colors.secondaryText],
    ),
  }));
  return (
    <Animated.Text style={[styles.tabLabel, colorStyle]}>{label}</Animated.Text>
  );
}

/** Individual date and match rows permit recycling and sticky indices without giant day cells. */
type LegendCalendarRow =
  | { kind: "date"; id: string; title: string }
  | { kind: "match"; id: string; match: DemoMatch };

/**
 * Pins date rows below the collapsed bands through the public sticky offset. LegendList itself adds
 * the container's top padding to the native refresh control; an explicit refresh offset would double it.
 */
const LegendCalendar = memo(function LegendCalendar({
  completed,
}: {
  completed: boolean;
}) {
  const calendar = useDemoCalendar(completed);
  const { tabBarHeight } = useCollapsingTabsContext();
  const data = useMemo<LegendCalendarRow[]>(
    () =>
      calendar.days.flatMap((day) => [
        { kind: "date" as const, id: `date:${day.title}`, title: day.title },
        ...day.data.map((match) => ({
          kind: "match" as const,
          id: match.id,
          match,
        })),
      ]),
    [calendar.days],
  );
  const stickyHeaderIndices = useMemo(
    () => data.flatMap((row, index) => (row.kind === "date" ? [index] : [])),
    [data],
  );
  return (
    <TabLegendList<LegendCalendarRow>
      data={data}
      recycleItems
      keyExtractor={(item) => item.id}
      getItemType={(item) => item.kind}
      stickyHeaderIndices={stickyHeaderIndices}
      stickyHeaderConfig={{ offset: minimumHeaderHeight + tabBarHeight }}
      refreshControl={<DemoRefreshControl calendar={calendar} />}
      contentContainerStyle={styles.calendarContent}
      onEndReached={() => {
        if (calendar.progressive && !calendar.refreshing) calendar.loadDays(4);
      }}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={<CalendarControls calendar={calendar} />}
      ListFooterComponent={<CalendarCount count={calendar.days.length * 30} />}
      renderItem={({ item }) =>
        item.kind === "date" ? (
          <DateHeader title={item.title} />
        ) : (
          <MatchCard match={item.match} />
        )
      }
    />
  );
});

/** The bottom 56-point summary remains after the stock container translates the upper card away. */
function DemoHeader() {
  const { colors } = useDemoTheme();
  return (
    <View
      pointerEvents="none"
      style={[styles.header, { backgroundColor: colors.surface }]}
    >
      <View style={styles.headerCard}>
        <Text style={[tokens.typography.headingXl, { color: colors.text }]}>
          Équipe démo
        </Text>
        <Text style={[tokens.typography.body, { color: colors.secondaryText }]}>
          Club fictif · Saison 2026–2027
        </Text>
      </View>
      <View style={[styles.headerSummary, { borderTopColor: colors.border }]}>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Équipe démo · Résumé minimal
        </Text>
      </View>
    </View>
  );
}

/** Owns only this calendar's local batches and refresh; stable props skip parent tab-index rerenders. */
const DemoCalendar = memo(function DemoCalendar({
  completed,
  collapsible,
}: {
  completed: boolean;
  collapsible: boolean;
}) {
  const calendar = useDemoCalendar(completed);
  const listProps: SectionListProps<DemoMatch> = {
    sections: calendar.days,
    keyExtractor: (item) => item.id,
    stickySectionHeadersEnabled: true,
    refreshControl: <DemoRefreshControl calendar={calendar} />,
    contentContainerStyle: styles.calendarContent,
    onEndReached: () => {
      if (calendar.progressive && !calendar.refreshing) calendar.loadDays(4);
    },
    onEndReachedThreshold: 0.5,
    ListHeaderComponent: <CalendarControls calendar={calendar} />,
    ListFooterComponent: <CalendarCount count={calendar.days.length * 30} />,
    renderSectionHeader: ({ section }) => <DateHeader title={section.title} />,
    renderItem: ({ item }) => <MatchCard match={item} />,
  };
  return collapsible ? (
    <Tabs.SectionList {...listProps} />
  ) : (
    <SectionList {...listProps} />
  );
});

/** Preserves stock refresh props injected by native ScrollView or either tab adapter. */
export function DemoRefreshControl({
  calendar,
  ...nativeProps
}: {
  calendar: DemoCalendarState;
} & Pick<RefreshControlProps, "children" | "style" | "progressViewOffset">) {
  const { colors } = useDemoTheme();
  return (
    <RefreshControl
      {...nativeProps}
      refreshing={calendar.refreshing}
      onRefresh={
        calendar.refreshing ? undefined : () => calendar.setRefreshing(true)
      }
      accessibilityLabel="Actualiser les données"
      accessibilityState={{ busy: calendar.refreshing }}
      colors={[colors.accentPrimary]}
      tintColor={colors.accentPrimary}
      progressBackgroundColor={colors.raised}
    />
  );
}

/** Shared fixture controls expose the same loaded volume and refresh result in all three modes. */
function CalendarControls({ calendar }: { calendar: DemoCalendarState }) {
  const { colors } = useDemoTheme();
  return (
    <View style={styles.instructions}>
      <Text style={[tokens.typography.strong, { color: colors.text }]}>
        {calendar.days.length * 30} matchs chargés / 3 000 ·{" "}
        {calendar.days.length} journées
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        style={[tokens.typography.metadata, { color: colors.text }]}
      >
        Actualisations : {calendar.refreshCount}
      </Text>
      <View style={styles.modeButtons}>
        <DemoButton
          label="Charge progressive"
          selected={calendar.progressive}
          onPress={() => calendar.setProgressive(!calendar.progressive)}
        />
        <DemoButton
          label="Charger 3 000 matchs"
          onPress={() => calendar.loadDays(100)}
        />
      </View>
    </View>
  );
}

/** Shows the actual loaded match count at the end of either list implementation. */
function CalendarCount({ count }: { count: number }) {
  const { colors } = useDemoTheme();
  return (
    <Text
      style={[styles.date, tokens.typography.metadata, { color: colors.text }]}
    >
      {count} matchs chargés / 3 000
    </Text>
  );
}

/** Keeps the horizontal date heading identical between native sections and recycled sticky rows. */
function DateHeader({ title }: { title: string }) {
  const { colors } = useDemoTheme();
  return (
    <View style={[styles.date, { backgroundColor: colors.canvas }]}>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.strong, { color: colors.text }]}
      >
        {title}
      </Text>
    </View>
  );
}

/** Renders one fictional match per native or recycled list row. */
function MatchCard({ match }: { match: DemoMatch }) {
  const { colors } = useDemoTheme();
  return (
    <View
      style={[
        styles.match,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[tokens.typography.strong, { color: colors.text }]}>
        {match.home} — {match.away}
      </Text>
      <Text style={[tokens.typography.body, { color: colors.secondaryText }]}>
        {match.detail}
      </Text>
    </View>
  );
}

/** Bounded short and empty pages expose the library's ordinary minimum-scroll behavior. */
function ShortContent({ empty }: { empty: boolean }) {
  const { colors } = useDemoTheme();
  return (
    <View style={styles.shortRows}>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.heading, { color: colors.text }]}
      >
        {empty ? "Aucun match fictif" : "Classement fictif"}
      </Text>
      {empty ? (
        <Text style={[tokens.typography.body, { color: colors.secondaryText }]}>
          Cette page est volontairement vide pour observer le changement
          d’onglet.
        </Text>
      ) : (
        ["Équipe démo", "Club visiteur", "Équipe locale"].map((team, index) => (
          <Text
            key={team}
            style={[tokens.typography.body, { color: colors.text }]}
          >
            {index + 1}. {team} · {9 - index * 3} points
          </Text>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pager: { overflow: "hidden" },
  tabRail: { paddingHorizontal: tokens.spacing.lg },
  tabItem: {
    width: "auto",
    height: tokens.touch.minimum,
    minHeight: tokens.touch.minimum,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
  },
  materialTabItem: { zIndex: 1 },
  legendTabItem: { marginRight: tokens.spacing.md, zIndex: 1 },
  tabLabel: { ...tokens.typography.label, margin: 0 },
  tabIndicator: { height: "100%", borderRadius: tokens.radius.control },
  instructions: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  modeButtons: { flexDirection: "row", gap: tokens.spacing.sm },
  modeButton: {
    flex: 1,
    minHeight: tokens.touch.minimum,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    padding: tokens.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { height: 180 },
  headerCard: { flex: 1, padding: tokens.spacing.lg, gap: tokens.spacing.sm },
  headerSummary: {
    height: 56,
    borderTopWidth: tokens.border.thin,
    paddingHorizontal: tokens.spacing.lg,
    justifyContent: "center",
  },
  calendarContent: { paddingBottom: tokens.spacing.lg },
  date: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  match: {
    marginHorizontal: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.lg,
    minHeight: 88,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    gap: tokens.spacing.sm,
  },
  shortContent: { padding: tokens.spacing.lg },
  shortRows: { gap: tokens.spacing.lg },
});
