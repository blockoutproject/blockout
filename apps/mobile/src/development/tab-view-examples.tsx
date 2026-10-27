import { memo, useEffect, useState } from "react";
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
  type SectionListProps,
} from "react-native";
import { MaterialTabBar, Tabs } from "react-native-collapsible-tab-view";
import { TabBar, TabView } from "react-native-tab-view";
import {
  appearanceColors,
  membershipColors,
  tokens,
} from "../shared/theme/tokens";
import { createDays, type DemoDay, type DemoMatch } from "./tab-view-fixtures";

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
  const [mode, setMode] = useState<"standard" | "collapsible">("standard");
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
          {(["standard", "collapsible"] as const).map((item) => (
            <DemoButton
              key={item}
              label={
                item === "standard" ? "TabView fixe" : "Header rétractable"
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
      {mode === "standard" ? <StandardTabs /> : <CollapsibleTabs />}
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

/** Keeps the same 180-point header fixed above the ordinary TabView and native lists. */
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
      minHeaderHeight={56}
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
  const { colors } = useDemoTheme();
  const [days, setDays] = useState<DemoDay[]>(() =>
    createDays(completed, 0, 4),
  );
  const [progressive, setProgressive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  // This local read simulation is cancelled when its calendar unmounts or its refresh completes.
  useEffect(() => {
    if (!refreshing) return;
    const timer = setTimeout(() => {
      setDays(createDays(completed, 0, 4));
      setRefreshCount((count) => count + 1);
      setRefreshing(false);
    }, 750);
    return () => clearTimeout(timer);
  }, [completed, refreshing]);
  /** Appends only absent days up to the 3,000-match cap, preserving existing section objects. */
  function loadDays(count: number) {
    if (refreshing) return;
    setDays((current) =>
      current.length >= 100
        ? current
        : [
            ...current,
            ...createDays(
              completed,
              current.length,
              Math.min(count, 100 - current.length),
            ),
          ],
    );
  }
  const listProps: SectionListProps<DemoMatch> = {
    sections: days,
    keyExtractor: (item) => item.id,
    stickySectionHeadersEnabled: true,
    refreshControl: (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={refreshing ? undefined : () => setRefreshing(true)}
        accessibilityLabel="Actualiser les données"
        accessibilityState={{ busy: refreshing }}
        colors={[colors.accentPrimary]}
        tintColor={colors.accentPrimary}
        progressBackgroundColor={colors.raised}
      />
    ),
    contentContainerStyle: styles.calendarContent,
    onEndReached: () => {
      if (progressive && !refreshing) loadDays(4);
    },
    onEndReachedThreshold: 0.5,
    ListHeaderComponent: (
      <View style={styles.instructions}>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          {days.length * 30} matchs chargés / 3 000 · {days.length} journées
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          style={[tokens.typography.metadata, { color: colors.text }]}
        >
          Actualisations : {refreshCount}
        </Text>
        <View style={styles.modeButtons}>
          <DemoButton
            label="Charge progressive"
            selected={progressive}
            onPress={() => setProgressive(!progressive)}
          />
          <DemoButton
            label="Charger 3 000 matchs"
            onPress={() => loadDays(100)}
          />
        </View>
      </View>
    ),
    ListFooterComponent: (
      <Text
        style={[
          styles.date,
          tokens.typography.metadata,
          { color: colors.text },
        ]}
      >
        {days.length * 30} matchs chargés / 3 000
      </Text>
    ),
    renderSectionHeader: ({ section }) => (
      <View style={[styles.date, { backgroundColor: colors.canvas }]}>
        <Text
          accessibilityRole="header"
          style={[tokens.typography.strong, { color: colors.text }]}
        >
          {section.title}
        </Text>
      </View>
    ),
    renderItem: ({ item }) => (
      <View
        style={[
          styles.match,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          {item.home} — {item.away}
        </Text>
        <Text style={[tokens.typography.body, { color: colors.secondaryText }]}>
          {item.detail}
        </Text>
      </View>
    ),
  };
  return collapsible ? (
    <Tabs.SectionList {...listProps} />
  ) : (
    <SectionList {...listProps} />
  );
});

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
