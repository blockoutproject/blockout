import { PageList } from "@/shared/components/page-list";
import { PageScrollView, pageContentStyle } from "@/shared/components/page";
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import { ListSeparator } from "@/shared/components/list-separator";
import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRef, type ReactElement, type ReactNode } from "react";
import type { LegendListRef } from "@legendapp/list/react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { SearchResultCard } from "./search-result-card";
import type { SearchResult } from "../model/search-result";

/** The parent derives accepted cards and the fixed heading from the same Query pages. */
export interface SearchResultsProps {
  items: readonly SearchResult[];
  examples?: boolean;
  emptyComponent?: ReactElement | null;
  continuation?: ReactNode;
  onEndReached?: () => void;
  /** Routes a selected identity through the scene's existing sporting-opening owner. */
  onOpen(item: SearchResult): void;
}

/**
 * Native rows and feedback share the viewport below Search controls.
 * Restores the last native offset after a scoped card; RNCT owns heading-inset geometry.
 */
export function SearchResults({
  items,
  examples = false,
  emptyComponent,
  continuation,
  onEndReached,
  onOpen,
}: Readonly<SearchResultsProps>) {
  const list = useRef<LegendListRef>(null);
  const offset = useRef(0);
  if (items.length === 0) {
    return (
      <PageScrollView>
        {emptyComponent}
        {continuation}
      </PageScrollView>
    );
  }
  return (
    <PageList
      ref={list}
      {...hiddenScrollIndicators}
      maintainVisibleContentPosition={{ size: false, data: true }}
      accessibilityRole="list"
      accessibilityLabel={examples ? "Exemples" : "Résultats de recherche"}
      alwaysBounceVertical
      onEndReached={onEndReached}
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
      ListFooterComponent={
        <>
          {continuation}
          <BottomContentSpacer />
        </>
      }
      data={items}
      keyExtractor={(item) => item.identity.id.toLowerCase()}
      getItemType={(item) => item.kind}
      recycleItems
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={pageContentStyle}
      ItemSeparatorComponent={ListSeparator}
      renderItem={({ item }) => (
        <SearchResultCard {...item} onPress={() => onOpen(item)} />
      )}
    />
  );
}

/** Labels available examples/results; an absent count represents a pending first read. */
export interface SearchHeadingProps {
  count?: number;
  examples?: boolean;
  onClear?: () => void;
}

/**
 * Product Design Search Heading 7130:19183; clearing preserves the selected resource tab.
 * The title and clear label stay vertically centered while wrapping preserves the action's native target.
 */
export function SearchHeading({
  count,
  examples = false,
  onClear,
}: Readonly<SearchHeadingProps>) {
  const { colors } = useTheme();
  let title = "Résultats";
  if (examples) {
    title = "Exemples";
  } else if (count !== undefined) {
    const plural = count === 1 ? "" : "s";
    title = `${count} résultat${plural} chargé${plural}`;
  }
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
      {onClear && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.layout.collection.toolbarMinHeight,
    gap: tokens.spacing.sm,
  },
  heading: { ...tokens.typography.navigation, flex: 1, minWidth: 0 },
  clear: {
    minHeight: tokens.touch.minimum,
    minWidth: tokens.touch.minimum,
    justifyContent: "center",
  },
});
