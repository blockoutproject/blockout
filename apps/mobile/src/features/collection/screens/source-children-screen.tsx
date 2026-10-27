import { ListSeparator } from "../../../shared/components/list-separator";
import { Page, pageContentStyle } from "../../../shared/components/page";
import { PreparationLink } from "../components/preparation-link";
import { AccessFeedback } from "../../access/components/access-feedback";
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

/** Visible native end-of-list events traverse direct children; a failed read replaces rows with explicit recovery. */
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
  const items = query.isError
    ? []
    : (query.data?.pages.flatMap((page) => page.items) ?? []);
  /** Refreshes the displayed catalog or its grant; Query owns the resulting loading/error state. */
  async function refresh() {
    if (query.isFetching) return;
    if (authority.enabled) await query.refetch({ cancelRefetch: false });
    else await authority.account.refetch({ cancelRefetch: false });
  }
  /** Repeated edge events cannot overlap reads, replay failures or outlive the visible authorized owner. */
  function loadMore() {
    if (
      !authority.enabled ||
      !authority.session.isCurrent(authority.session.generation) ||
      !navigation.isFocused() ||
      !query.hasNextPage ||
      query.isError ||
      query.isFetching ||
      authority.account.isFetching
    )
      return;
    void query.fetchNextPage({ cancelRefetch: false });
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
            alwaysBounceVertical
            refreshControl={
              authority.sessionStatus === "authenticated" ? (
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
            onEndReached={loadMore}
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
                ) : query.isPending ? (
                  <RequestLoading />
                ) : query.isError ? (
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
              authority.enabled &&
              !query.isError &&
              query.isFetchingNextPage ? (
                <View style={styles.footer}>
                  <RequestLoading />
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
