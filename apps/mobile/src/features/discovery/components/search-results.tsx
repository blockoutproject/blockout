import { PageList } from "@/shared/components/page-list";
import { pageContentStyle } from "@/shared/components/page";
import { ListSeparator } from "@/shared/components/list-separator";
import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { StyleSheet, Text, View } from "react-native";
import type { ReactElement, ReactNode } from "react";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import {
  SportingEntityCard,
  SportingEntityCardLoading,
} from "@/features/sporting/entity-card";
import type { SearchResult } from "../model/search-result";

export interface SearchResultsProps {
  resource: SearchResult["kind"];
  items: readonly SearchResult[];
  loading: boolean;
  examples?: boolean;
  heading?: ReactElement;
  emptyComponent?: ReactElement | null;
  continuation?: ReactNode;
  onEndReached?: () => void;
  /** Routes a selected identity through the scene's existing sporting-opening owner. */
  onOpen(item: SearchResult): void;
}

/** Keeps results and their structural feedback in the same list viewport. */
export function SearchResults({
  resource,
  items,
  loading,
  examples = false,
  heading,
  emptyComponent,
  continuation,
  onEndReached,
  onOpen,
}: Readonly<SearchResultsProps>) {
  const hasItems = items.length > 0;
  return (
    <PageList
      maintainVisibleContentPosition={{ size: false, data: true }}
      accessibilityRole={hasItems ? "list" : undefined}
      accessibilityLabel={
        hasItems
          ? examples
            ? "Exemples"
            : "Résultats de recherche"
          : undefined
      }
      alwaysBounceVertical={hasItems}
      onEndReached={onEndReached}
      ListHeaderComponent={heading}
      ListHeaderComponentStyle={
        hasItems || loading ? styles.listHeading : undefined
      }
      loadingFeedback={{
        active: loading,
        content: (
          <SportingEntityCardLoading
            kind={resource}
            label="Chargement des résultats"
          />
        ),
      }}
      ListEmptyComponent={emptyComponent}
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
  heading: {
    minHeight: tokens.layout.collection.toolbarMinHeight,
    justifyContent: "center",
  },
});
