import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from "@tanstack/react-query";
import type { ReactElement } from "react";
import { useNavigation } from "expo-router";
import { StyleSheet, View } from "react-native";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { ListContinuation } from "@/shared/components/list-continuation";
import { ListLoading } from "@/shared/components/list-loading";
import {
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "@/shared/components/page";
import { PageFlatList } from "@/shared/components/page-list";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ReloadButton } from "@/shared/components/reload-button";
import { ScreenState } from "@/shared/components/screen-state";
import { EmptyState } from "@/shared/components/state-card";
import { tokens } from "@/shared/theme/tokens";
import { uniqueMappingItems } from "../api/mapping-queries";

/** A failed continuation belongs below the accepted rows. A failed full read replaces them. */
export function MappingList<Row extends { id: string }>({
  query,
  loadingLabel,
  emptyLabel,
  header,
  renderRow,
}: Readonly<{
  query: UseInfiniteQueryResult<InfiniteData<{ items: Row[] }>>;
  loadingLabel: string;
  emptyLabel: string;
  header?: ReactElement;
  renderRow: (row: Row) => ReactElement;
}>) {
  const navigation = useNavigation();
  const continuationFailed = !!query.data && query.isFetchNextPageError;
  const failed = hasReadError(query) && !continuationFailed;
  if (!query.data || failed) {
    const Layout = failed ? ScreenState : PageContent;
    return (
      <PageScrollView>
        <Layout>
          <ReadFeedback
            query={query}
            loadingContent={<ListLoading label={loadingLabel} />}
          />
        </Layout>
      </PageScrollView>
    );
  }

  function loadMore() {
    if (navigation.isFocused() && query.hasNextPage && !query.isFetching) {
      void query.fetchNextPage({ cancelRefetch: false });
    }
  }

  const rows = uniqueMappingItems(query.data.pages);
  return (
    <PageFlatList
      data={rows}
      keyExtractor={({ id }) => id}
      contentContainerStyle={pageContentStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        rows.length > 0 || header ? (
          <DataRefreshControl
            enabled={!query.isFetchingNextPage && !continuationFailed}
            fetching={query.isFetching}
            onRefresh={() => query.refetch({ cancelRefetch: false })}
          />
        ) : undefined
      }
      ItemSeparatorComponent={MappingListSeparator}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState title={emptyLabel}>
          {!header && (
            <ReloadButton
              fetching={query.isFetching}
              onReload={() => query.refetch({ cancelRefetch: false })}
            />
          )}
        </EmptyState>
      }
      renderItem={({ item }) => renderRow(item)}
      onEndReached={continuationFailed ? undefined : loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        <ListContinuation
          loading={query.isFetchingNextPage}
          failed={continuationFailed}
          onRetry={loadMore}
        />
      }
    />
  );
}

function MappingListSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  separator: { height: tokens.spacing.sm },
});
