import { isResourceReadRefused } from "@/shared/api/access-denied";
import { hashKey, useInfiniteQuery } from "@tanstack/react-query";
import { useIsFocused, useNavigation, useRouter } from "expo-router";
import type { ReactNode } from "react";
import type { CollectionResultSourceResponse } from "../../../../.generated/schemas/index.zod";
import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { useContentReveal } from "@/shared/components/content-reveal";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { ListContinuation } from "@/shared/components/list-continuation";
import { ListSeparator } from "@/shared/components/list-separator";
import { Page, pageContentStyle } from "@/shared/components/page";
import { PageList } from "@/shared/components/page-list";
import { PageReadState } from "@/shared/components/page-read-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ReloadButton } from "@/shared/components/reload-button";
import { ScreenState } from "@/shared/components/screen-state";
import { SearchField } from "@/shared/components/search-field";
import {
  SearchToolbar,
  searchToolbarMinHeight,
} from "@/shared/components/search-toolbar";
import { EmptyState } from "@/shared/components/state-card";
import { fetchNextPageIfReady } from "@/shared/query/infinite-pages";
import { useSubmittedSearch } from "@/shared/forms/use-submitted-search";
import { tokens } from "@/shared/theme/tokens";
import {
  createCollectionQueries,
  type CollectionResultCriteria,
} from "../api/collection-queries";
import { useCollectionAuthority } from "../api/use-collection-season";
import {
  CollectionBilanResult,
  CollectionBilanResultsLoading,
} from "../components/collection-bilan-result";
import {
  collectionResultKey,
  collectionResultRows,
} from "../model/collection-result-presentation";

export interface CollectionBilanScreenProps {
  header: ReactNode;
  controlId: string;
  /** The active route owns the committed criteria even while another screen is pushed above it. */
  criteria: CollectionResultCriteria;
  onOpenFilters: () => void;
  onViewSource?: (source: CollectionResultSourceResponse) => void;
  searchPlaceholder?: string;
}

/** Query owns the server-ordered traversal. A failed continuation leaves its accepted list mounted. */
export function CollectionBilanScreen({
  header,
  controlId,
  criteria,
  onOpenFilters,
  onViewSource,
  searchPlaceholder = "Poule, source, étape…",
}: Readonly<CollectionBilanScreenProps>) {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const router = useRouter();
  const authority = useCollectionAuthority();
  const options = createCollectionQueries(authority).results(
    controlId,
    criteria,
  );
  // Keep a failed traversal available for explicit recovery across automatic Query events.
  const query = useInfiniteQuery({
    ...options,
    enabled: (state) => authority.enabled && state.state.status !== "error",
  });
  const searchField = useSubmittedSearch(criteria.query, (text) =>
    router.setParams({ query: text.trim() }),
  );
  const reveal = useContentReveal(focused);
  const contextKey = hashKey(options.queryKey);
  const refused = isResourceReadRefused(query.error);
  const continuationFailed =
    !!query.data && query.isFetchNextPageError && !refused;
  const failed = hasReadError(query) && !continuationFailed;
  const filtered = !!(criteria.sourceId || criteria.status || criteria.stage);

  const rows = collectionResultRows(query.data?.pages);
  const empty = query.data && rows.length === 0 && !query.hasNextPage;
  const refreshable =
    authority.enabled &&
    rows.length > 0 &&
    !continuationFailed &&
    !query.isFetchingNextPage;

  function loadMore() {
    fetchNextPageIfReady(query, authority.enabled && navigation.isFocused());
  }

  return (
    <Page
      header={
        <>
          {header}
          {!refused && (
            <SearchToolbar
              filter={
                failed
                  ? undefined
                  : { active: filtered, onPress: onOpenFilters }
              }
            >
              <SearchField
                {...searchField}
                label="Rechercher dans le bilan"
                placeholder={searchPlaceholder}
              />
            </SearchToolbar>
          )}
        </>
      }
      headerMinHeight={
        refused ? undefined : tokens.layout.header + searchToolbarMinHeight
      }
    >
      {failed ? (
        <PageReadState>
          <ReadFeedback
            key={contextKey}
            query={query}
            loadingContent={null}
            onRetry={
              authority.enabled
                ? () => query.refetch({ cancelRefetch: false })
                : undefined
            }
          />
        </PageReadState>
      ) : (
        <PageList
          key={contextKey}
          testID="collection-bilan-list"
          data={rows}
          keyExtractor={collectionResultKey}
          reveal={{ presentation: reveal }}
          contentContainerStyle={empty ? undefined : pageContentStyle}
          alwaysBounceVertical={rows.length > 0}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          maintainVisibleContentPosition={{ size: false, data: true }}
          refreshControl={
            <DataRefreshControl
              enabled={refreshable}
              fetching={query.isFetching}
              onRefresh={() => query.refetch({ cancelRefetch: false })}
            />
          }
          ItemSeparatorComponent={ListSeparator}
          renderItem={({ item }) => (
            <CollectionBilanResult result={item} onViewSource={onViewSource} />
          )}
          onEndReached={() => {
            if (!query.isError) {
              loadMore();
            }
          }}
          onEndReachedThreshold={0.5}
          loadingFeedback={{
            active: query.isPending && query.isFetching,
            content: <CollectionBilanResultsLoading />,
          }}
          ListEmptyComponent={
            empty ? (
              <ScreenState>
                <EmptyState
                  title={
                    filtered || criteria.query
                      ? "Aucun résultat pour ces critères"
                      : "Aucun résultat observé"
                  }
                >
                  <ReloadButton query={query} disabled={!authority.enabled} />
                </EmptyState>
              </ScreenState>
            ) : undefined
          }
          ListFooterComponent={
            <>
              <ListContinuation
                loading={query.isFetchingNextPage}
                failed={continuationFailed}
                disabled={query.isFetching}
                onRetry={loadMore}
              />
              <BottomContentSpacer />
            </>
          }
        />
      )}
    </Page>
  );
}
