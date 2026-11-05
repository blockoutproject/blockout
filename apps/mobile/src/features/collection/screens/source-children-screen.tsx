import { PageFlatList } from "../../../shared/components/page-list";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { ListSeparator } from "../../../shared/components/list-separator";
import {
  Page,
  PageContent,
  pageContentStyle,
} from "../../../shared/components/page";
import { PreparationLink } from "../components/preparation-link";
import { AccessFeedback } from "../../access/components/access-feedback";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";

import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { useNavigation, useRouter } from "expo-router";
import { Layers, RefreshCw } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Button } from "../../../shared/components/button";
import { ListLoading } from "../../../shared/components/list-loading";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useSourceChildren } from "../api/use-source-preparation";

/** Read-only discovery traversal; pack navigation never exposes sporting classification actions. Authorized rows survive technical failures and continuation retries stay local. */
export function SourceChildrenScreen({
  seasonId,
  sourceId,
  parentId,
}: {
  seasonId: string;
  sourceId: string;
  parentId?: string;
}) {
  const { authority, query } = useSourceChildren(sourceId, parentId);
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const feedback = useActionFeedback();
  const pending = !authority.enabled
    ? authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading)
    : !isAccessDenied(query.error) && query.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;
  const denied = isAccessDenied(query.error);
  // Catalog changes can repeat a child across pages; retain its first position with its latest representation.
  const items = denied
    ? []
    : [
        ...new Map(
          (query.data?.pages ?? [])
            .flatMap((page) => page.items)
            .map((item) => [item.id, item]),
        ).values(),
      ];

  /** Refreshes the admitted catalog; a failed technical reread retains authorized content and reports its outcome. */
  async function refresh() {
    if (query.isFetching) {
      return;
    }
    const result = await query.refetch({ cancelRefetch: false });
    if (result.isError && items.length > 0 && !isAccessDenied(result.error)) {
      feedback.error();
    }
  }

  /** Shared continuation command keeps traversal and scope; automatic edges separately exclude failed reads. */
  async function loadMore() {
    if (
      !authority.enabled ||
      !navigation.isFocused() ||
      !query.hasNextPage ||
      denied ||
      query.isFetching
    ) {
      return;
    }
    feedback.clear();
    await query.fetchNextPage({ cancelRefetch: false });
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
              enabled={!query.isFetchingNextPage}
              onRefresh={refresh}
            />
          ) : undefined
        }
        data={authority.enabled ? items : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          authority.enabled && items.length ? pageContentStyle : styles.list
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
          <FeedbackLayout>
            {!authority.enabled ? (
              <AccessFeedback
                {...authority}
                loadingContent={
                  <ListLoading label="Chargement des groupes découverts" />
                }
              />
            ) : denied ? (
              <ErrorState
                onRetry={() => void query.refetch({ cancelRefetch: false })}
                retrying={query.isFetching}
              />
            ) : query.isLoading ? (
              <ListLoading label="Chargement des groupes découverts" />
            ) : query.isError || query.isPending ? (
              <ErrorState
                onRetry={() => void query.refetch({ cancelRefetch: false })}
                retrying={query.isFetching}
              />
            ) : (
              <EmptyState title="Aucun groupe découvert">
                <Button
                  label="Actualiser"
                  leadingIcon={RefreshCw}
                  onPress={() => void refresh()}
                  loading={query.isFetching}
                />
              </EmptyState>
            )}
          </FeedbackLayout>
        }
        ListFooterComponent={
          <>
            {authority.enabled && !denied && query.hasNextPage ? (
              <View style={styles.footer}>
                <ListContinuation
                  loading={query.isFetchingNextPage}
                  failed={query.isFetchNextPageError}
                  disabled={query.isFetching}
                  onRetry={loadMore}
                />
              </View>
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
  footer: { paddingTop: tokens.spacing.lg },
});
