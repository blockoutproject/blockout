import { zodResolver } from "@hookform/resolvers/zod";
import { hashKey, useInfiniteQuery } from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import type { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, StyleSheet } from "react-native";
import {
  ListCollectionResultsParams,
  type CollectionResultSourceResponse,
} from "../../../../.generated/schemas/index.zod";
import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { useContentReveal } from "@/shared/components/content-reveal";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { ListContinuation } from "@/shared/components/list-continuation";
import { ListSeparator } from "@/shared/components/list-separator";
import {
  Page,
  PageScrollView,
  pageContentStyle,
} from "@/shared/components/page";
import { PageList } from "@/shared/components/page-list";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ReloadButton } from "@/shared/components/reload-button";
import { ScreenState } from "@/shared/components/screen-state";
import { SearchField } from "@/shared/components/search-field";
import { SearchToolbar } from "@/shared/components/search-toolbar";
import { EmptyState } from "@/shared/components/state-card";
import { tokens } from "@/shared/theme/tokens";
import {
  createCollectionQueries,
  isCollectionReadRefused,
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
  onSearch: (query?: string) => void;
  onOpenFilters: () => void;
  onViewSource: (source: CollectionResultSourceResponse) => void;
}

const searchSchema = ListCollectionResultsParams.pick({
  query: true,
}).required();

/** Query owns the server-ordered traversal. A failed continuation leaves its accepted list mounted. */
export function CollectionBilanScreen({
  header,
  controlId,
  criteria,
  onSearch,
  onOpenFilters,
  onViewSource,
}: Readonly<CollectionBilanScreenProps>) {
  const navigation = useNavigation();
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
  const { control, handleSubmit, reset } = useForm({
    values: { query: criteria.query ?? "" },
    resolver: zodResolver(searchSchema),
    mode: "onChange",
  });
  const reveal = useContentReveal();
  const contextKey = hashKey(options.queryKey);
  const refused = isCollectionReadRefused(query.error);
  const continuationFailed =
    !!query.data && query.isFetchNextPageError && !refused;
  const failed = hasReadError(query) && !continuationFailed;
  const filtered = !!(criteria.sourceId || criteria.status || criteria.stage);

  if (failed) {
    return (
      <Page header={header}>
        <PageScrollView>
          <ScreenState>
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
          </ScreenState>
        </PageScrollView>
      </Page>
    );
  }

  const rows = collectionResultRows(query.data?.pages);
  const refreshable =
    authority.enabled &&
    rows.length > 0 &&
    !continuationFailed &&
    !query.isFetchingNextPage;

  function loadMore() {
    if (
      authority.enabled &&
      navigation.isFocused() &&
      query.hasNextPage &&
      !query.isFetching
    ) {
      void query.fetchNextPage({ cancelRefetch: false });
    }
  }

  return (
    <Page
      header={
        <>
          {header}
          <SearchToolbar
            style={styles.toolbar}
            filter={{
              active: filtered,
              onPress: onOpenFilters,
            }}
          >
            <Controller
              control={control}
              name="query"
              render={({ field, fieldState }) => (
                <SearchField
                  ref={field.ref}
                  label="Rechercher dans le bilan"
                  placeholder="Poule, source, étape…"
                  value={field.value}
                  autoCorrect={false}
                  returnKeyType="search"
                  onBlur={field.onBlur}
                  error={
                    fieldState.invalid
                      ? "La recherche est limitée à 200 caractères."
                      : undefined
                  }
                  onChangeText={field.onChange}
                  onSubmitEditing={() =>
                    void handleSubmit(({ query }) =>
                      onSearch(query.trim() || undefined),
                    )()
                  }
                  onClear={() => {
                    reset({ query: "" });
                    onSearch();
                  }}
                />
              )}
            />
          </SearchToolbar>
        </>
      }
      headerMinHeight={
        tokens.layout.header + tokens.size.control.default + tokens.spacing.xs
      }
    >
      <PageList
        key={contextKey}
        testID="collection-bilan-list"
        data={rows}
        keyExtractor={collectionResultKey}
        reveal={{ presentation: reveal }}
        contentContainerStyle={pageContentStyle}
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
          <CollectionBilanResult
            result={item}
            onViewSource={(source) => {
              Keyboard.dismiss();
              onViewSource(source);
            }}
          />
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
          query.data && !query.hasNextPage ? (
            <ScreenState style={styles.noExtraInset}>
              <EmptyState
                title={
                  filtered || criteria.query
                    ? "Aucun résultat pour ces critères"
                    : "Aucun résultat observé"
                }
              >
                <ReloadButton
                  fetching={query.isFetching}
                  onReload={() => query.refetch({ cancelRefetch: false })}
                  disabled={!authority.enabled}
                />
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
    </Page>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingBottom: tokens.spacing.xs },
  noExtraInset: { padding: 0 },
});
