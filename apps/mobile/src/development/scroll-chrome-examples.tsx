import { BlurTargetView, BlurView } from "expo-blur";
import { Ellipsis } from "lucide-react-native";
import { useMemo, useState, type ComponentRef, type RefObject } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  DefaultTabBar,
  Tabs,
  useActiveTabScrollY,
  useCollapseProgress,
  useCollapsingTabsContext,
  useHeaderScrollY,
  type TabBarRenderProps,
} from "react-native-collapsible-tab";
import { TabLegendList } from "react-native-collapsible-tab/legend-list";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { SportingMedia } from "../features/sporting/components/sporting-media";
import { Button } from "../shared/components/button";
import { IconButton } from "../shared/components/icon-button";
import { ThemeProvider, useTheme } from "../shared/theme/theme-provider";
import { tokens } from "../shared/theme/tokens";
import { BottomNavigationExamplesScreen } from "./bottom-navigation-examples";
import {
  TrialBottomNavigation,
  TrialDetailBar,
  TrialHomeBrand,
  TrialPoolCard,
  TrialSearchBar,
  TrialSearchResult,
  TrialSeasonPill,
  TrialTeamCard,
  trialSearchNames,
} from "./scroll-chrome-content";
import {
  DemoAnimatedTabLabel,
  DemoRefreshControl,
  TabViewExamplesScreen,
} from "./tab-view-examples";
import type { DemoDay, DemoMatch } from "./tab-view-fixtures";
import { useDemoCalendar, type DemoCalendarState } from "./use-demo-calendar";

/** Local scenarios share no production route, query, account or provider state. */
type Example = "home" | "team" | "search" | "baseline" | "navigation";

/** One-shot fixture controls appear only in the native example chooser. */
type TrialAction = { label: string; run: () => void };

/** A mounted native target is supplied before its BlurView is created, including the first tab. */
type BlurTarget = RefObject<ComponentRef<typeof View> | null> | undefined;

/** Local example navigation remains outside the three product-shaped compositions. */
interface TrialNavigation {
  onChooseExample: (actions?: TrialAction[]) => void;
  onHome: () => void;
  onSearch: () => void;
  onTeam: () => void;
}

/** Development-only visual host retaining the accepted LegendList baseline beside new native trials. */
export function ScrollChromeExamplesScreen() {
  return (
    <ThemeProvider>
      <TrialExamples />
    </ThemeProvider>
  );
}

/** Keeps scenario changes explicit and provides bounded fixture controls without adding product routes. */
function TrialExamples() {
  const [example, setExample] = useState<Example>("home");
  const [menu, setMenu] = useState<TrialAction[] | null>(null);
  const { colors } = useTheme();
  const navigation: TrialNavigation = {
    onChooseExample: (actions = []) => setMenu(actions),
    onHome: () => setExample("home"),
    onSearch: () => setExample("search"),
    onTeam: () => setExample("team"),
  };
  const choices: { value: Example; label: string }[] = [
    { value: "home", label: "Accueil · flou et dates latérales" },
    { value: "team", label: "Équipe · carte rétractable" },
    { value: "search", label: "Recherche · header fixe" },
    { value: "baseline", label: "Comparaison initiale validée" },
    { value: "navigation", label: "Navigation basse · animations" },
  ];
  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      {example === "baseline" ? (
        <SafeAreaView style={styles.screen}>
          <Button
            label="Choisir un exemple"
            variant="secondary"
            onPress={() => setMenu([])}
          />
          <TabViewExamplesScreen />
        </SafeAreaView>
      ) : example === "navigation" ? (
        <BottomNavigationExamplesScreen onBack={() => setMenu([])} />
      ) : example === "search" ? (
        <SearchTrial {...navigation} />
      ) : (
        <MatchTrial key={example} screen={example} {...navigation} />
      )}
      <Modal
        visible={menu !== null}
        transparent
        animationType="none"
        onRequestClose={() => setMenu(null)}
      >
        <View style={styles.menuHost}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer les exemples"
            onPress={() => setMenu(null)}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.overlayScrim },
            ]}
          />
          <ScrollView
            style={[styles.menu, { backgroundColor: colors.surface }]}
            contentContainerStyle={styles.menuContent}
          >
            <Text
              accessibilityRole="header"
              style={[tokens.typography.heading, { color: colors.text }]}
            >
              Essais natifs
            </Text>
            {choices.map(({ value, label }) => (
              <Button
                key={value}
                label={label}
                variant="secondary"
                onPress={() => {
                  setMenu(null);
                  setExample(value);
                }}
              />
            ))}
            {menu?.map(({ label, run }) => (
              <Button
                key={label}
                label={label}
                variant="secondary"
                onPress={() => {
                  setMenu(null);
                  run();
                }}
              />
            ))}
            <Button label="Fermer" onPress={() => setMenu(null)} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/** Callback refs publish only actual native mounts; the blur never captures an initially empty ref. */
function useTrialBlurTargets(activeIndex: number) {
  const [targets, setTargets] = useState<(ComponentRef<typeof View> | null)[]>([
    null,
    null,
    null,
  ]);
  const callbacks = useMemo(
    () =>
      [0, 1, 2].map((index) => (node: ComponentRef<typeof View> | null) => {
        setTargets((current) =>
          current[index] === node
            ? current
            : current.map((target, slot) => (slot === index ? node : target)),
        );
      }),
    [],
  );
  const activeTarget: BlurTarget = useMemo(
    () =>
      targets[activeIndex] ? { current: targets[activeIndex] } : undefined,
    [targets, activeIndex],
  );
  return { callbacks, activeTarget };
}

/** One native blur covers the complete chrome; an opaque canvas fades using the stock active scroll. */
function ChromeBackdrop({
  target,
  height,
}: {
  target: BlurTarget;
  height: number;
}) {
  const { colors, scheme } = useTheme();
  const scrollY = useActiveTabScrollY();
  const ready = target !== undefined;
  const opaqueStyle = useAnimatedStyle(() => ({
    opacity: ready ? 1 - Math.min(1, Math.max(0, scrollY.value) / 64) : 1,
  }));
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[styles.chromeBackground, { height }]}
    >
      {target && (
        <BlurView
          blurTarget={target}
          blurMethod="dimezisBlurView"
          intensity={100}
          tint={
            scheme === "dark"
              ? "systemThickMaterialDark"
              : "systemThickMaterialLight"
          }
          style={StyleSheet.absoluteFill}
        />
      )}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.canvas },
          opaqueStyle,
        ]}
      />
    </View>
  );
}

/** Home removes its brand row while the ordinary pager moves its tab/season row upward. */
function HomeHeader({
  target,
  navigation,
}: {
  target: BlurTarget;
  navigation: TrialNavigation;
}) {
  const insets = useSafeAreaInsets();
  const { headerHeight, tabBarHeight } = useCollapsingTabsContext();
  const progress = useCollapseProgress();
  const brandStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  return (
    <View style={{ paddingTop: insets.top }}>
      <ChromeBackdrop target={target} height={headerHeight + tabBarHeight} />
      <Animated.View style={brandStyle}>
        <TrialHomeBrand
          onChooseExample={() => navigation.onChooseExample()}
          onOpenSearch={navigation.onSearch}
        />
      </Animated.View>
    </View>
  );
}

/**
 * RNCT owns collapse and gestures. Opposite visual translations pin the navigation and card viewport,
 * while the card exits through native clipping; all header dimensions stay in their natural layout.
 */
function TeamHeader({
  target,
  navigation,
}: {
  target: BlurTarget;
  navigation: TrialNavigation;
}) {
  const insets = useSafeAreaInsets();
  const { headerHeight, tabBarHeight } = useCollapsingTabsContext();
  const collapse = useHeaderScrollY();
  const progress = useCollapseProgress();
  const { colors } = useTheme();
  const pinnedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: collapse.value }],
  }));
  const scrollingCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -collapse.value }],
  }));
  const compactStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <View style={{ paddingTop: insets.top + tokens.layout.header }}>
      <ChromeBackdrop target={target} height={headerHeight + tabBarHeight} />
      <Animated.View
        pointerEvents="box-none"
        style={[styles.teamCard, styles.cardViewport, pinnedStyle]}
      >
        <Animated.View style={scrollingCardStyle}>
          <TrialTeamCard />
        </Animated.View>
      </Animated.View>
      <Animated.View
        style={[
          styles.pinnedNavigation,
          { paddingTop: insets.top },
          pinnedStyle,
        ]}
      >
        <TrialDetailBar onChooseExample={() => navigation.onChooseExample()}>
          <Animated.View style={[styles.compactIdentity, compactStyle]}>
            <SportingMedia
              identity={{ name: "Volley des Deux Rives", shortName: "VDR" }}
              kind="team"
              size={28}
            />
            <Text
              numberOfLines={1}
              style={[styles.compactTitle, { color: colors.text }]}
            >
              Volley des Deux Rives
            </Text>
          </Animated.View>
        </TrialDetailBar>
      </Animated.View>
    </View>
  );
}

/** Shared pill presentation uses the accepted stock indicator and the same continuous label interpolation. */
function TrialTabBar(props: TabBarRenderProps) {
  const { colors, membership } = useTheme();
  return (
    <DefaultTabBar
      {...props}
      backgroundColor="transparent"
      indicatorColor={membership.fill}
      style={styles.tabBar}
      tabStyle={styles.tabItem}
      indicatorStyle={styles.indicator}
      renderLabel={({ label, index }) => (
        <DemoAnimatedTabLabel
          label={label}
          index={index}
          position={props.indexDecimal}
        />
      )}
      inactiveColor={colors.secondaryText}
      activeColor={membership.content}
    />
  );
}

/** Two concrete header compositions share the same three recycled calendar pages and fixture controls. */
function MatchTrial({
  screen,
  ...navigation
}: { screen: "home" | "team" } & TrialNavigation) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const upcoming = useDemoCalendar(false);
  const completed = useDemoCalendar(true);
  const followed = useDemoCalendar(false);
  const calendars = [upcoming, completed, followed];
  const { callbacks, activeTarget } = useTrialBlurTargets(activeIndex);
  const [onUpcomingMount, onCompletedMount, onFollowedMount] = callbacks;
  const minimumHeader =
    insets.top + (screen === "team" ? tokens.layout.header : 0);
  const active = calendars[activeIndex];
  /** Native menu actions act only on the selected local calendar. */
  function chooseExample() {
    navigation.onChooseExample([
      {
        label: `Charger 3 000 matchs (${active.days.length * 30} chargés)`,
        run: () => active.loadDays(100),
      },
      {
        label: `Charge progressive : ${active.progressive ? "activée" : "désactivée"}`,
        run: () => active.setProgressive(!active.progressive),
      },
    ]);
  }
  const localNavigation = { ...navigation, onChooseExample: chooseExample };
  return (
    <View style={styles.screen}>
      <Tabs.Container
        headerBackgroundColor="transparent"
        minHeaderHeight={minimumHeader}
        onIndexChange={setActiveIndex}
        renderHeader={() =>
          screen === "home" ? (
            <HomeHeader target={activeTarget} navigation={localNavigation} />
          ) : (
            <TeamHeader target={activeTarget} navigation={localNavigation} />
          )
        }
        renderTabBar={(props) => (
          <View style={styles.matchTabs}>
            <View style={styles.flex}>
              <TrialTabBar {...props} />
            </View>
            {screen === "home" && <TrialSeasonPill />}
            {screen === "team" && (
              <IconButton label="Choisir un exemple" onPress={chooseExample}>
                <Ellipsis size={20} />
              </IconButton>
            )}
          </View>
        )}
      >
        <Tabs.Tab name="upcoming" label="À venir">
          <BlurTargetView ref={onUpcomingMount} style={styles.screen}>
            <TrialCalendar
              calendar={upcoming}
              completed={false}
              pinnedHeaderHeight={minimumHeader}
              onOpenTeam={navigation.onTeam}
            />
          </BlurTargetView>
        </Tabs.Tab>
        <Tabs.Tab name="completed" label="Terminés">
          <BlurTargetView ref={onCompletedMount} style={styles.screen}>
            <TrialCalendar
              calendar={completed}
              completed
              pinnedHeaderHeight={minimumHeader}
              onOpenTeam={navigation.onTeam}
            />
          </BlurTargetView>
        </Tabs.Tab>
        <Tabs.Tab
          name="followed"
          label={screen === "home" ? "Suivis" : "Poule A de Prénationale"}
        >
          <BlurTargetView ref={onFollowedMount} style={styles.screen}>
            <TrialCalendar
              calendar={followed}
              completed={false}
              pinnedHeaderHeight={minimumHeader}
              onOpenTeam={navigation.onTeam}
            />
          </BlurTargetView>
        </Tabs.Tab>
      </Tabs.Container>
      <View style={[styles.bottomNavigation, { bottom: insets.bottom }]}>
        <TrialBottomNavigation
          selected="home"
          onHome={navigation.onHome}
          onSearch={navigation.onSearch}
          onChooseExample={chooseExample}
        />
      </View>
    </View>
  );
}

/** Grid dates and empty rail slots occupy one column; each bounded pool card occupies the other seven. */
type CalendarGridRow =
  | { kind: "date"; id: string; title: string; day: number; completed: boolean }
  | { kind: "space"; id: string }
  | { kind: "pool"; id: string; index: number; matches: DemoMatch[] };

/** Consecutive date/card pairs share a real grid row; no entire day is rendered as a single list cell. */
function calendarGridRows(
  days: DemoDay[],
  completed: boolean,
): CalendarGridRow[] {
  return days.flatMap((day, dayIndex) =>
    day.data.flatMap((match, index) => [
      index === 0
        ? {
            kind: "date" as const,
            id: `date:${day.title}`,
            title: day.title,
            day: dayIndex,
            completed,
          }
        : { kind: "space" as const, id: `space:${match.id}` },
      {
        kind: "pool" as const,
        id: match.id,
        index,
        matches: [
          {
            ...match,
            home: trialSearchNames[index % 4],
            away: trialSearchNames[(index + 1) % 4],
          },
        ],
      },
    ]),
  );
}

/** Standard column spans keep only dates sticky; the empty rail cells have no artificial content height. */
function TrialCalendar({
  calendar,
  completed,
  pinnedHeaderHeight,
  onOpenTeam,
}: {
  calendar: DemoCalendarState;
  completed: boolean;
  pinnedHeaderHeight: number;
  onOpenTeam: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { tabBarHeight } = useCollapsingTabsContext();
  const data = useMemo(
    () => calendarGridRows(calendar.days, completed),
    [calendar.days, completed],
  );
  const stickyHeaderIndices = useMemo(
    () => data.flatMap((row, index) => (row.kind === "date" ? [index] : [])),
    [data],
  );
  return (
    <TabLegendList<CalendarGridRow>
      data={data}
      numColumns={8}
      overrideItemLayout={(layout, item, _index, columns) => {
        layout.span = item.kind === "pool" ? columns - 1 : 1;
      }}
      recycleItems
      getItemType={(item) => item.kind}
      keyExtractor={(item) => item.id}
      getFixedItemSize={(item) => (item.kind === "space" ? 0 : undefined)}
      stickyHeaderIndices={stickyHeaderIndices}
      stickyHeaderConfig={{
        offset: pinnedHeaderHeight + tabBarHeight + tokens.spacing.sm,
      }}
      contentContainerStyle={[
        styles.calendarContent,
        { paddingBottom: insets.bottom + 100 },
      ]}
      refreshControl={<DemoRefreshControl calendar={calendar} />}
      onEndReached={() => {
        if (calendar.progressive && !calendar.refreshing) calendar.loadDays(4);
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        <Text style={[styles.fixtureCount, { color: colors.secondaryText }]}>
          {calendar.days.length * 30} matchs fictifs · Actualisations :{" "}
          {calendar.refreshCount}
        </Text>
      }
      renderItem={({ item }) =>
        item.kind === "space" ? null : item.kind === "date" ? (
          <TrialDateRail
            title={item.title}
            day={item.day}
            completed={item.completed}
          />
        ) : (
          <View style={styles.poolCell}>
            <TrialPoolCard
              matches={item.matches}
              poolIndex={item.index}
              completed={completed}
              onOpenTeam={onOpenTeam}
            />
          </View>
        )
      }
    />
  );
}

/** The single native sticky cell shows the prototype's compact lateral day, weekday and month. */
function TrialDateRail({
  title,
  day,
  completed,
}: {
  title: string;
  day: number;
  completed: boolean;
}) {
  const { colors } = useTheme();
  const date = new Date(Date.UTC(2026, 9, completed ? 26 - day : 27 + day));
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={title}
      style={styles.dateRail}
    >
      <Text style={[tokens.typography.headingXl, { color: colors.text }]}>
        {date.getUTCDate()}
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        {new Intl.DateTimeFormat("fr-FR", {
          weekday: "short",
          timeZone: "UTC",
        }).format(date)}
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        {new Intl.DateTimeFormat("fr-FR", {
          month: "short",
          timeZone: "UTC",
        }).format(date)}
      </Text>
    </View>
  );
}

/** Fixed Search chrome keeps tabs above its controlled input; blur follows scroll even without collapse. */
function SearchChrome({
  target,
  tabBar,
  value,
  onChangeText,
  onChooseExample,
}: {
  target: BlurTarget;
  tabBar: TabBarRenderProps;
  value: string;
  onChangeText: (value: string) => void;
  onChooseExample: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { tabBarHeight } = useCollapsingTabsContext();
  return (
    <View style={{ paddingTop: insets.top }}>
      <ChromeBackdrop target={target} height={tabBarHeight} />
      <View style={styles.searchTabs}>
        <View style={styles.flex}>
          <TrialTabBar {...tabBar} />
        </View>
        <IconButton label="Choisir un exemple" onPress={onChooseExample}>
          <Ellipsis color={colors.icon} size={24} />
        </IconButton>
      </View>
      <TrialSearchBar
        value={value}
        onChangeText={onChangeText}
        onChooseExample={onChooseExample}
      />
      <Text
        accessibilityRole="header"
        style={[styles.searchHeading, { color: colors.text }]}
      >
        {value ? "Résultats fictifs" : "Exemples"}
      </Text>
    </View>
  );
}

/** Local search exercises native paging, keyboard dismissal and fixed chrome without a network query. */
function SearchTrial(navigation: TrialNavigation) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [value, setValue] = useState("");
  const { callbacks, activeTarget } = useTrialBlurTargets(activeIndex);
  const data = useMemo(
    () =>
      Array.from({ length: 40 }, (_, index) => index).filter((index) =>
        trialSearchNames[index % trialSearchNames.length]
          .toLocaleLowerCase("fr")
          .includes(value.toLocaleLowerCase("fr")),
      ),
    [value],
  );
  return (
    <View style={styles.screen}>
      <Tabs.Container
        headerBackgroundColor="transparent"
        onIndexChange={setActiveIndex}
        renderTabBar={(props) => (
          <SearchChrome
            target={activeTarget}
            tabBar={props}
            value={value}
            onChangeText={setValue}
            onChooseExample={() => navigation.onChooseExample()}
          />
        )}
      >
        {(["Équipes", "Poules", "Clubs"] as const).map((label, index) => (
          <Tabs.Tab name={label} label={label} key={label}>
            <BlurTargetView ref={callbacks[index]} style={styles.screen}>
              <TabLegendList
                data={data}
                recycleItems
                keyExtractor={(item) => String(item)}
                contentContainerStyle={[
                  styles.searchContent,
                  { paddingBottom: insets.bottom + 100 },
                ]}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={styles.fixtureCount}>Aucun résultat fictif</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.searchCell}>
                    <TrialSearchResult
                      index={item}
                      onOpenTeam={navigation.onTeam}
                    />
                  </View>
                )}
              />
            </BlurTargetView>
          </Tabs.Tab>
        ))}
      </Tabs.Container>
      <View style={[styles.bottomNavigation, { bottom: insets.bottom }]}>
        <TrialBottomNavigation
          selected="search"
          onHome={navigation.onHome}
          onSearch={navigation.onSearch}
          onChooseExample={() => navigation.onChooseExample()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  chromeBackground: { position: "absolute", left: 0, right: 0, top: 0 },
  teamCard: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.lg,
  },
  cardViewport: { overflow: "hidden" },
  pinnedNavigation: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1,
  },
  compactIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  compactTitle: { ...tokens.typography.strong, flex: 1 },
  matchTabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingRight: tokens.spacing.lg,
  },
  searchTabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: tokens.spacing.sm,
  },
  tabBar: { borderBottomWidth: 0, paddingLeft: tokens.spacing.xs },
  tabItem: {
    minHeight: tokens.touch.minimum,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    marginRight: tokens.spacing.md,
    zIndex: 1,
  },
  indicator: { height: "100%", borderRadius: tokens.radius.control },
  bottomNavigation: { position: "absolute", left: 0, right: 0 },
  calendarContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
  },
  poolCell: { paddingBottom: tokens.spacing.md },
  dateRail: { width: 40, alignItems: "flex-start" },
  fixtureCount: { ...tokens.typography.metadata, padding: tokens.spacing.lg },
  searchContent: { paddingHorizontal: tokens.spacing.lg },
  searchCell: { paddingBottom: tokens.spacing.md },
  searchHeading: {
    ...tokens.typography.strong,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
  },
  menuHost: {
    flex: 1,
    justifyContent: "center",
    padding: tokens.spacing["2xl"],
  },
  menu: {
    borderRadius: tokens.radius.panel,
    maxHeight: "90%",
  },
  menuContent: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
});
