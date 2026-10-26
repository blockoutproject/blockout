import { pageContentStyle } from "../../../shared/components/page";
import { ListSeparator } from "../../../shared/components/list-separator";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import type { ReactElement, ReactNode } from "react";
import type { DiscoveryPage } from "../api/discovery-queries";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { SearchResultCard } from "./search-result-card";
import { searchResults } from "../model/search-result";

/** Text results retain native read lifecycle and continuation supplied by their query owner. */
export interface SearchResultsProps {
  /** Undefined means the current search has no accepted read, so its heading has no count yet. */
  pages?: readonly DiscoveryPage[];
  onClear: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  emptyComponent: ReactElement;
  continuation?: ReactNode;
}

/** Keeps one native list/header through reads; the query owner supplies loading or empty feedback. */
export function SearchResults({
  pages,
  onClear,
  refreshing,
  onRefresh,
  emptyComponent,
  continuation,
}: SearchResultsProps) {
  // A resource moved between pages keeps one row under its stable public identity.
  const items = [
    ...new Map(
      (pages ?? [])
        .flatMap(searchResults)
        .map((item) => [item.identity.id, item]),
    ).values(),
  ];
  return (
    <FlatList
      alwaysBounceVertical
      refreshControl={
        <DataRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListFooterComponent={
        items.length && continuation ? (
          <View style={styles.continuation}>{continuation}</View>
        ) : undefined
      }
      data={items}
      keyExtractor={(item) => item.identity.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={
        items.length ? [pageContentStyle, searchResultsStartStyle] : styles.list
      }
      ListHeaderComponentStyle={
        !items.length
          ? [pageContentStyle, searchResultsStartStyle, styles.header]
          : undefined
      }
      ListHeaderComponent={
        <SearchResultsHeading
          count={pages ? items.length : undefined}
          onClear={onClear}
        />
      }
      ListEmptyComponent={emptyComponent}
      ItemSeparatorComponent={ListSeparator}
      renderItem={({ item }) => <SearchResultCard {...item} />}
    />
  );
}

/** The collection toolbar labels loaded results; an absent count represents a pending or failed initial read. */
export interface SearchResultsHeadingProps {
  count?: number;
  onClear: () => void;
}

/**
 * Product Design collection toolbar 6294:170665; clearing preserves the selected resource tab.
 * The title wraps within the remaining row width while the clear action keeps its own target.
 */
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
  list: { flexGrow: 1 },
  header: { flexGrow: 0 },
  start: { paddingTop: tokens.spacing.xs },
  continuation: { paddingTop: tokens.spacing.lg },
  toolbar: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: tokens.layout.collection.toolbarMinHeight,
    gap: tokens.spacing.sm,
  },
  heading: { ...tokens.typography.navigation, flex: 1, minWidth: 0 },
  clear: {
    minHeight: tokens.touch.minimum,
    minWidth: tokens.touch.minimum,
    justifyContent: "flex-start",
  },
});

/** The 4-point start combines with text leading for the search gap; full touch targets extend below. */
const searchResultsStartStyle = styles.start;
