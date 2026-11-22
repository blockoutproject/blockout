import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from "@tanstack/react-query";
import type { ReactElement } from "react";
import { useNavigation } from "expo-router";
import type { ListRenderItem } from "react-native";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { ListContinuation } from "@/shared/components/list-continuation";
import { ListLoading } from "@/shared/components/list-loading";
import { ListSeparator } from "@/shared/components/list-separator";
import { pageContentStyle } from "@/shared/components/page";
import { PageReadState } from "@/shared/components/page-read-state";
import { PageFlatList } from "@/shared/components/page-list";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ReloadButton } from "@/shared/components/reload-button";
import { EmptyState } from "@/shared/components/state-card";
import { tokens } from "@/shared/theme/tokens";
import {
  fetchNextPageIfReady,
  uniquePageRows,
} from "@/shared/query/infinite-pages";

/** A failed continuation belongs below the accepted rows. A failed full read replaces them. */
export function MappingList<Row extends { id: string }>({
  query,
  loadingLabel,
  emptyLabel,
  header,
  renderItem,
}: Readonly<{
  query: UseInfiniteQueryResult<InfiniteData<{ items: Row[] }>>;
  loadingLabel: string;
  emptyLabel: string;
  header?: ReactElement;
  renderItem: ListRenderItem<Row>;
}>) {
  const navigation = useNavigation();
  const continuationFailed = !!query.data && query.isFetchNextPageError;
  const failed = hasReadError(query) && !continuationFailed;
  if (!query.data || failed) {
    return (
      <PageReadState pending={!failed}>
        <ReadFeedback
          query={query}
          loadingContent={<ListLoading label={loadingLabel} />}
        />
      </PageReadState>
    );
  }

  function loadMore() {
    fetchNextPageIfReady(query, navigation.isFocused());
  }

  const rows = uniquePageRows(
    query.data.pages.flatMap(({ items }) => items),
    ({ id }) => id,
  );
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
      ItemSeparatorComponent={<ListSeparator gap={tokens.spacing.sm} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState title={emptyLabel}>
          {!header && <ReloadButton query={query} />}
        </EmptyState>
      }
      renderItem={renderItem}
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
