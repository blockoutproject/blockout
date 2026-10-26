import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import type { ReactNode } from "react";
import type { DiscoveryPage } from "../api/discovery-queries";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { SearchResultCard } from "./search-result-card";
import { searchResults } from "../model/search-result";

/** Text results retain native read lifecycle and continuation supplied by their query owner. */
export interface SearchResultsProps {
  pages: readonly DiscoveryPage[];
  onClear: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  continuation?: ReactNode;
}

/** Virtualizes current summaries with stable UUIDs and a loaded count that never claims a total. */
export function SearchResults({
  pages,
  onClear,
  refreshing,
  onRefresh,
  continuation,
}: SearchResultsProps) {
  // A resource moved between pages keeps one row under its stable public identity.
  const items = [
    ...new Map(
      pages.flatMap(searchResults).map((item) => [item.identity.id, item]),
    ).values(),
  ];
  return (
    <FlatList
      alwaysBounceVertical
      refreshControl={
        <DataRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListFooterComponent={
        continuation ? (
          <View style={styles.continuation}>{continuation}</View>
        ) : undefined
      }
      data={items}
      keyExtractor={(item) => item.identity.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <>
          <SearchResultsHeading count={items.length} onClear={onClear} />
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
  const title =
    count === undefined
      ? "Résultats"
      : `${count} résultat${count === 1 ? "" : "s"} chargé${count === 1 ? "" : "s"}`;
  return (
    <View style={styles.toolbar}>
      <Text
        accessibilityRole="header"
        accessibilityLabel={title}
        accessibilityLiveRegion="polite"
        style={[styles.heading, { color: colors.text }]}
      >
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Effacer"
        onPress={onClear}
        style={({ pressed }) => [
          styles.clear,
          { opacity: pressed ? tokens.opacity.pressed : 1 },
        ]}
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
    flexGrow: 1,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.section,
  },
  continuation: { paddingTop: tokens.spacing.lg },
  separator: { height: tokens.spacing.md },
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
