import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ReactNode } from "react";
import type { DiscoveryPage } from "../api/discovery-queries";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import {
  SearchResultCard,
  type SearchResultCardProps,
} from "./search-result-card";

/** Maps current generated summaries to available presentation slots without storing a second result collection. */
function results(page: DiscoveryPage): SearchResultCardProps[] {
  if ("clubs" in page)
    return page.clubs.map(({ club, city }) => ({
      kind: "club",
      identity: club,
      city,
    }));
  if ("teams" in page)
    return page.teams.map(({ team, club, season, classification }) => ({
      kind: "team",
      identity: team,
      subtitle: club?.name,
      season,
      classification,
    }));
  return page.pools.map(
    ({ pool, season, classification, competitionName, phaseName }) => ({
      kind: "pool",
      identity: pool,
      subtitle:
        [competitionName, phaseName].filter(Boolean).join(" · ") || undefined,
      season,
      classification,
    }),
  );
}

/** Initial text results; complete continuation and destination activation remain with US4. */
export interface SearchResultsProps {
  pages: readonly DiscoveryPage[];
  onClear: () => void;
  feedback?: ReactNode;
}

/** Virtualizes current summaries with stable UUIDs and a loaded count that never claims a total. */
export function SearchResults({
  pages,
  onClear,
  feedback,
}: SearchResultsProps) {
  const items = pages.flatMap(results);
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.identity.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <>
          <SearchResultsHeading count={items.length} onClear={onClear} />
          {feedback && <View style={styles.feedback}>{feedback}</View>}
        </>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => <SearchResultCard {...item} />}
    />
  );
}

/** The collection toolbar labels loaded results; an absent count represents a pending or failed initial read. */
export interface SearchResultsHeadingProps {
  count?: number;
  onClear: () => void;
}

/** Product Design collection toolbar 6294:170665; clearing is explicit and preserves the selected resource tab. */
export function SearchResultsHeading({
  count,
  onClear,
}: SearchResultsHeadingProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.toolbar}>
      <Text
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={[styles.heading, { color: colors.text }]}
      >
        {count === undefined
          ? "Résultats"
          : `${count} résultat${count === 1 ? "" : "s"} chargé${count === 1 ? "" : "s"}`}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onClear}
        style={styles.clear}
      >
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Effacer
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.section,
  },
  separator: { height: tokens.spacing.md },
  feedback: { paddingVertical: tokens.spacing.xl },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: tokens.size.collectionToolbar,
    gap: tokens.spacing.sm,
  },
  heading: { ...tokens.typography.navigation, flexShrink: 1 },
  clear: {
    minHeight:
      Platform.OS === "android"
        ? tokens.touchTarget.android
        : tokens.touchTarget.ios,
    minWidth:
      Platform.OS === "android"
        ? tokens.touchTarget.android
        : tokens.touchTarget.ios,
    justifyContent: "center",
  },
});
