import { ListSeparator } from "../../../shared/components/list-separator";
import { Page, pageContentStyle } from "../../../shared/components/page";
import { PreparationLink } from "../components/preparation-link";
import { AccessFeedback } from "../../access/components/access-feedback";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { useNavigation, useRouter } from "expo-router";
import { Layers } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { ClassificationEntry } from "../../sporting-administration/entry";
import { useSourceChildren } from "../api/use-source-preparation";

/** Native edges traverse direct children; authorized rows survive technical failures and continuation retries stay local. */
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
  const denied = isAccessDenied(query.error);
  const items = denied
    ? []
    : (query.data?.pages.flatMap((page) => page.items) ?? []);
  /** Refreshes the admitted catalog; a failed technical reread retains authorized content and reports its outcome. */
  async function refresh() {
    if (query.isFetching) return;
    const result = await query.refetch({ cancelRefetch: false });
    if (result.isError && result.data && !isAccessDenied(result.error))
      feedback.error();
  }
  /** Shared continuation command keeps traversal and scope; automatic edges separately exclude failed reads. */
  async function loadMore() {
    if (
      !authority.enabled ||
      !authority.session.isCurrent(authority.session.generation) ||
      !navigation.isFocused() ||
      !query.hasNextPage ||
      denied ||
      query.isFetching ||
      authority.account.isFetching
    )
      return;
    feedback.clear();
    const result = await query.fetchNextPage({ cancelRefetch: false });
    if (
      result.isFetchNextPageError &&
      result.data &&
      !isAccessDenied(result.error) &&
      authority.session.isCurrent(authority.session.generation) &&
      navigation.isFocused()
    )
      feedback.error();
  }
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<PageHeader title="Groupes découverts" />}>
        {({ onScroll, headerHeight }) => (
          <Animated.FlatList
            testID="collection-source-children-list"
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            alwaysBounceVertical={authority.enabled && !denied && !!query.data}
            refreshControl={
              authority.enabled && !denied && query.data ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  enabled={!query.isFetchingNextPage}
                  refreshing={
                    query.isRefetching || authority.account.isRefetching
                  }
                  onRefresh={() => void refresh()}
                />
              ) : undefined
            }
            data={authority.enabled ? items : []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              authority.enabled && items.length
                ? pageContentStyle
                : styles.list,
              {
                paddingTop:
                  headerHeight +
                  (authority.enabled && items.length
                    ? tokens.layout.content.start
                    : 0),
              },
            ]}
            ItemSeparatorComponent={ListSeparator}
            onEndReached={() => {
              if (!query.isError) loadMore();
            }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <>
                {parentId && authority.enabled && (
                  <View
                    style={[!items.length && pageContentStyle, styles.header]}
                  >
                    <ClassificationEntry
                      target={{ kind: "pack", id: parentId }}
                    />
                  </View>
                )}
              </>
            }
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
                <View>
                  <Text
                    style={[tokens.typography.body, { color: colors.text }]}
                  >
                    {item.label}
                  </Text>
                  <ClassificationEntry target={{ kind: "pool", id: item.id }} />
                </View>
              )
            }
            ListEmptyComponent={
              <ScreenState>
                {!authority.enabled ? (
                  <AccessFeedback {...authority} />
                ) : denied ? (
                  <ErrorState
                    onRetry={() => void query.refetch({ cancelRefetch: false })}
                    retrying={query.isFetching}
                  />
                ) : query.isPending ? (
                  <RequestLoading />
                ) : query.isError && !query.data ? (
                  <ErrorState
                    onRetry={() => void query.refetch({ cancelRefetch: false })}
                    retrying={query.isFetching}
                  />
                ) : (
                  <EmptyState title="Aucun groupe découvert" />
                )}
              </ScreenState>
            }
            ListFooterComponent={
              authority.enabled && !denied && query.hasNextPage ? (
                <View style={styles.footer}>
                  <ListContinuation
                    loading={query.isFetchingNextPage}
                    failed={query.isFetchNextPageError}
                    disabled={query.isFetching || authority.account.isFetching}
                    onRetry={loadMore}
                  />
                </View>
              ) : undefined
            }
          />
        )}
      </ScrollChrome>
    </Page>
  );
}
const styles = StyleSheet.create({
  list: { flexGrow: 1 },
  header: { paddingBottom: tokens.spacing.lg },
  footer: { paddingTop: tokens.spacing.lg },
});
