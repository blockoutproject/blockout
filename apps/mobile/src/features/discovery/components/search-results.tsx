import { pageContentStyle } from "../../../shared/components/page";
import { ListSeparator } from "../../../shared/components/list-separator";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactElement, ReactNode } from "react";
import { TabLegendList } from "react-native-collapsible-tab/legend-list";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { SearchResultCard } from "./search-result-card";
import type { SearchResult } from "../model/search-result";

/** The parent derives accepted cards and the fixed heading from the same Query pages. */
export interface SearchResultsProps {
  items: readonly SearchResult[];
  emptyComponent?: ReactElement | null;
  continuation?: ReactNode;
}

/** One mounted native list retains its scroll registration through blank, loading, error and populated states. */
export function SearchResults({
  items,
  emptyComponent,
  continuation,
}: SearchResultsProps) {
  return (
    <TabLegendList
      alwaysBounceVertical
      ListFooterComponent={
        items.length && continuation ? (
          <View style={styles.continuation}>{continuation}</View>
        ) : undefined
      }
      data={items}
      ListEmptyComponent={emptyComponent}
      keyExtractor={(item) => item.identity.id}
      getItemType={(item) => item.kind}
      recycleItems
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={
        items.length ? [pageContentStyle, styles.cards] : styles.list
      }
      ItemSeparatorComponent={ListSeparator}
      renderItem={({ item }) => <SearchResultCard {...item} />}
    />
  );
}

/** The search heading labels loaded results; an absent count represents a pending or failed initial read. */
export interface SearchHeadingProps {
  count?: number;
  onClear: () => void;
}

/**
 * Product Design Search Heading 7130:19183; clearing preserves the selected resource tab.
 * The title wraps within the remaining row width while the clear action keeps its own target.
 */
export function SearchHeading({ count, onClear }: SearchHeadingProps) {
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
  cards: { paddingTop: 0 },
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
