import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { EmptyState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";
import { useRouter } from "expo-router";
import { Layers } from "lucide-react-native";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Button } from "../../../shared/components/button";
import {
  AccessDenied,
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { ClassificationEntry } from "../../sporting-administration/entry";
import { useSourceChildren } from "../api/use-source-preparation";
import {
  CollectionAccessFeedback,
  PreparationLink,
  preparationStyles,
} from "../components/preparation-layout";

/** Read-only native catalog context; pack navigation never grants mapping or acquisition readiness. */
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
  const denied = isAccessDenied(query.error);
  const items = denied
    ? []
    : (query.data?.pages.flatMap((page) => page.items) ?? []);
  const feedback = useActionFeedback();
  /** Refreshes the displayed catalog or its grant and leaves retained rows usable after failure. */
  async function refresh() {
    if (query.isFetching) return;
    const result = authority.enabled
      ? await query.refetch({ cancelRefetch: false })
      : await authority.account.refetch({ cancelRefetch: false });
    if (result.isError && result.data && !isAccessDenied(result.error))
      feedback.error();
  }
  /** Pagination retains the existing traversal and the same continuation command after an error. */
  async function loadMore() {
    const result = await query.fetchNextPage({ cancelRefetch: false });
    if (result.isError && !isAccessDenied(result.error)) feedback.error();
  }
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PageHeader title="Groupes découverts" />
      <FlatList
        alwaysBounceVertical
        refreshControl={
          authority.sessionStatus === "authenticated" ? (
            <DataRefreshControl
              enabled={!query.isFetchingNextPage}
              refreshing={query.isRefetching || authority.account.isRefetching}
              onRefresh={() => void refresh()}
            />
          ) : undefined
        }
        data={authority.enabled ? items : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          preparationStyles.content,
          (!authority.enabled || items.length === 0) && styles.stateContent,
        ]}
        ListHeaderComponent={
          <>
            {parentId && authority.enabled && (
              <ClassificationEntry target={{ kind: "pack", id: parentId }} />
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
              <Text style={[tokens.typography.body, { color: colors.text }]}>
                {item.label}
              </Text>
              <ClassificationEntry target={{ kind: "pool", id: item.id }} />
            </View>
          )
        }
        ListEmptyComponent={
          <ScreenState>
            {!authority.enabled ? (
              <CollectionAccessFeedback authority={authority} />
            ) : denied ? (
              <AccessDenied message="Ces groupes ne sont pas accessibles." />
            ) : query.isPending ? (
              <RequestLoading />
            ) : query.isError && !query.data ? (
              <RequestError
                message="Les groupes sont indisponibles."
                onRetry={() => void query.refetch()}
                retrying={query.isFetching}
              />
            ) : (
              <EmptyState title="Aucun groupe découvert" />
            )}
          </ScreenState>
        }
        ListFooterComponent={
          authority.enabled && !denied && query.hasNextPage ? (
            <Button
              label={
                query.isFetchNextPageError ? "Réessayer" : "Charger la suite"
              }
              variant="secondary"
              onPress={() => void loadMore()}
              disabled={query.isFetching}
              loading={query.isFetchingNextPage}
            />
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  stateContent: { paddingVertical: tokens.spacing.lg },
});
