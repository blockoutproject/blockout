import { PageList } from "@/shared/components/page-list";
import { PageScrollView, pageContentStyle } from "@/shared/components/page";
import { ListSeparator } from "@/shared/components/list-separator";
import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { StyleSheet, Text, View } from "react-native";
import { useRef, type ReactElement, type ReactNode } from "react";
import type { LegendListRef } from "@legendapp/list/react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { SportingEntityCard } from "@/features/sporting/entity-card";
import type { SearchResult } from "../model/search-result";

export interface SearchResultsProps {
  items: readonly SearchResult[];
  examples?: boolean;
  heading?: ReactElement;
  emptyComponent?: ReactElement | null;
  continuation?: ReactNode;
  onEndReached?: () => void;
  /** Routes a selected identity through the scene's existing sporting-opening owner. */
  onOpen(item: SearchResult): void;
}

/**
 * Native rows and feedback share the viewport below Search controls.
 * Restores the last native offset after a scoped card while the shared page supplies the toolbar inset.
 */
export function SearchResults({
  items,
  examples = false,
  heading,
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
        {heading && <View style={styles.feedbackHeading}>{heading}</View>}
        {emptyComponent}
        {continuation}
      </PageScrollView>
    );
  }
  return (
    <PageList
      ref={list}
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
      ListHeaderComponent={heading}
      ListHeaderComponentStyle={styles.listHeading}
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
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={ListSeparator}
      renderItem={({ item }) => (
        <SportingEntityCard {...item} onPress={() => onOpen(item)} />
      )}
    />
  );
}

/** Labels available examples/results; an absent count represents a pending first read. */
export interface SearchHeadingProps {
  count?: number;
  examples?: boolean;
}

/** Product Design Search Heading 7130:19183 keeps the existing compact vertical clearance. */
export function SearchHeading({
  count,
  examples = false,
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
    <View style={styles.heading}>
      <Text
        accessibilityRole="header"
        accessibilityLabel={title}
        accessibilityLiveRegion="polite"
        style={[tokens.typography.navigation, { color: colors.text }]}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { ...pageContentStyle, paddingTop: 0 },
  listHeading: { paddingBottom: tokens.layout.content.start },
  feedbackHeading: { paddingHorizontal: tokens.spacing.screen },
  heading: {
    minHeight: tokens.layout.collection.toolbarMinHeight,
    justifyContent: "center",
  },
});
