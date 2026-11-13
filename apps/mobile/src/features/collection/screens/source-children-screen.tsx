import { PageFlatList } from "@/shared/components/page-list";
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import { ListSeparator } from "@/shared/components/list-separator";
import { Page, PageContent, pageContentStyle } from "@/shared/components/page";
import { PreparationLink } from "../components/preparation-link";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { isCollectionReadRefused } from "../api/collection-queries";
import { ListContinuation } from "@/shared/components/list-continuation";
import { EmptyState } from "@/shared/components/state-card";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { PageHeader } from "@/shared/components/page-header";

import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { useNavigation, useRouter } from "expo-router";
import { Layers, RefreshCw } from "lucide-react-native";
import { StyleSheet, Text } from "react-native";

import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { Button } from "@/shared/components/button";
import { ListLoading } from "@/shared/components/list-loading";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useSourceChildren } from "../api/use-source-preparation";

/** Read-only discovery traversal; pack navigation never exposes sporting classification actions. Authorized rows survive technical failures and continuation retries stay local. */
export function SourceChildrenScreen({
  seasonId,
  sourceId,
  parentId,
}: Readonly<{
  seasonId: string;
  sourceId: string;
  parentId?: string;
}>) {
  const { authority, query } = useSourceChildren(sourceId, parentId);
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const pending = !authority.enabled
    ? authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading)
    : !hasReadError(query) && query.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;
  const denied = isCollectionReadRefused(query.error);
  const failedRead = hasReadError(query) && !query.isFetchNextPageError;
  const continuationVisible =
    authority.enabled &&
    !!query.data &&
    !denied &&
    !failedRead &&
    (query.isFetchNextPageError || query.isFetchingNextPage);
  // Catalog changes can repeat a child across pages; retain its first position with its latest representation.
  const items =
    denied || failedRead
      ? []
      : [
          ...new Map(
            (query.data?.pages ?? [])
              .flatMap((page) => page.items)
              .map((item) => [item.id, item]),
          ).values(),
        ];

  /** Full rereads own the scope's card; next-page errors keep their separate continuation footer. */
  async function refresh() {
    await query.refetch({ cancelRefetch: false });
  }

  /** Shared continuation command keeps traversal and scope; automatic edges separately exclude failed reads. */
  async function loadMore() {
    if (
      !authority.enabled ||
      !navigation.isFocused() ||
      !query.hasNextPage ||
      denied ||
      query.isFetching ||
      (query.isError && !query.isFetchNextPageError)
    ) {
      return;
    }
    await query.fetchNextPage({ cancelRefetch: false });
  }

  /** Prioritizes current admission and read failures over an empty discovery result. */
  function renderEmptyState() {
    if (!authority.enabled) {
      return (
        <AccessFeedback
          {...authority}
          loadingContent={
            <ListLoading label="Chargement des groupes découverts" />
          }
        />
      );
    }
    if (denied || failedRead || query.isPending) {
      return (
        <ReadFeedback
          query={query}
          loadingContent={
            <ListLoading label="Chargement des groupes découverts" />
          }
        />
      );
    }
    return (
      <EmptyState title="Aucun groupe découvert">
        <Button
          label="Actualiser"
          leadingIcon={RefreshCw}
          onPress={() => void refresh()}
          loading={query.isFetching}
        />
      </EmptyState>
    );
  }

  return (
    <Page header={<PageHeader title="Groupes découverts" />}>
      <PageFlatList
        {...hiddenScrollIndicators}
        testID="collection-source-children-list"
        alwaysBounceVertical={authority.enabled && !denied && items.length > 0}
        refreshControl={
          authority.enabled && !denied && items.length > 0 ? (
            <DataRefreshControl
              fetching={query.isFetching}
              enabled={!query.isFetchingNextPage}
              onRefresh={refresh}
            />
          ) : undefined
        }
        data={authority.enabled ? items : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          authority.enabled && (items.length > 0 || continuationVisible)
            ? pageContentStyle
            : styles.list
        }
        ItemSeparatorComponent={ListSeparator}
        onEndReached={() => {
          if (!query.isError) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) =>
          item.kind === "pack" ? (
            <PreparationLink
              label={item.label}
              icon={Layers}
              onPress={() =>
                router.push({
                  pathname:
                    "/collection/[seasonId]/sources/[sourceId]/children",
                  params: { seasonId, sourceId, parentId: item.id },
                })
              }
            />
          ) : (
            <Text style={[tokens.typography.body, { color: colors.text }]}>
              {item.label}
            </Text>
          )
        }
        ListEmptyComponent={
          continuationVisible ? undefined : (
            <FeedbackLayout>{renderEmptyState()}</FeedbackLayout>
          )
        }
        ListFooterComponent={
          <>
            {authority.enabled &&
            !denied &&
            !failedRead &&
            query.hasNextPage ? (
              <ListContinuation
                loading={query.isFetchingNextPage}
                failed={query.isFetchNextPageError}
                disabled={query.isFetching}
                onRetry={loadMore}
              />
            ) : undefined}
            <BottomContentSpacer />
          </>
        }
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1 },
});
