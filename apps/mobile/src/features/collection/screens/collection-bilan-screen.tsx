import { zodResolver } from "@hookform/resolvers/zod";
import { hashKey, useInfiniteQuery } from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import type { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, StyleSheet, View } from "react-native";
import {
  ListCollectionResultsParams,
  type CollectionResultSourceResponse,
} from "../../../../.generated/schemas/index.zod";
import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { useContentReveal } from "@/shared/components/content-reveal";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FilterButton } from "@/shared/components/filter-button";
import { ListContinuation } from "@/shared/components/list-continuation";
import { ListSeparator } from "@/shared/components/list-separator";
import {
  Page,
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "@/shared/components/page";
import { PageList } from "@/shared/components/page-list";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { SearchField } from "@/shared/components/search-field";
import { EmptyState } from "@/shared/components/state-card";
import { tokens } from "@/shared/theme/tokens";
import {
  createCollectionQueries,
  isCollectionReadRefused,
  type CollectionResultCriteria,
} from "../api/collection-queries";
import { useCollectionAuthority } from "../api/use-source-preparation";
import { CollectionBilanResult } from "../components/collection-bilan-result";
import { CollectionResultsLoading } from "../components/collection-loading";
import { collectionResultKey } from "../model/collection-result-presentation";

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
  const query = useInfiniteQuery(options);
  const { control, handleSubmit, reset } = useForm({
    defaultValues: { query: criteria.query ?? "" },
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
              onRetry={() => query.refetch({ cancelRefetch: false })}
            />
          </ScreenState>
        </PageScrollView>
      </Page>
    );
  }

  // Offset pages can overlap as newer observations change server order. Keep the first slot and the latest admitted row.
  const rows = [
    ...new Map(
      query.data?.pages.flatMap((page) =>
        page.items.map((item) => [collectionResultKey(item), item] as const),
      ),
    ).values(),
  ];

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
          <View style={styles.toolbar}>
            <View style={styles.search}>
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
            </View>
            <FilterButton
              active={filtered}
              onPress={() => {
                Keyboard.dismiss();
                onOpenFilters();
              }}
            />
          </View>
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
        alwaysBounceVertical={!!query.data}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        maintainVisibleContentPosition={{ size: false, data: true }}
        refreshControl={
          query.data ? (
            <DataRefreshControl
              enabled={!query.isFetchingNextPage}
              fetching={query.isFetching}
              onRefresh={() => query.refetch({ cancelRefetch: false })}
            />
          ) : undefined
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
          content: (
            <PageContent style={styles.noExtraInset}>
              <CollectionResultsLoading />
            </PageContent>
          ),
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
              />
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
  toolbar: {
    paddingHorizontal: tokens.spacing.screen,
    paddingBottom: tokens.spacing.xs,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.spacing.sm,
  },
  search: { flex: 1, minWidth: 0 },
  noExtraInset: { padding: 0 },
});
