import { useRouter } from "expo-router";
import { Layers } from "lucide-react-native";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../shared/components/button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { ClassificationEntry } from "../../sporting-administration/entry";
import { useSourceChildren } from "../api/use-source-preparation";
import {
  CollectionAccessFeedback,
  PreparationHeader,
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
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PreparationHeader title="Groupes découverts" />
      <FlatList
        data={authority.enabled ? items : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={preparationStyles.content}
        ListHeaderComponent={
          <>
            <CollectionAccessFeedback authority={authority} />
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
          authority.enabled ? (
            query.isPending ? (
              <RequestLoading />
            ) : !query.isError ? (
              <Text style={[tokens.typography.strong, { color: colors.text }]}>
                Aucun groupe découvert
              </Text>
            ) : undefined
          ) : undefined
        }
        ListFooterComponent={
          authority.enabled ? (
            query.isError ? (
              <RequestError
                message="Les groupes sont indisponibles."
                onRetry={() =>
                  void (query.isFetchNextPageError
                    ? query.fetchNextPage()
                    : query.refetch())
                }
                retrying={query.isFetching}
              />
            ) : query.hasNextPage ? (
              <Button
                label="Afficher la suite"
                variant="secondary"
                onPress={() => void query.fetchNextPage()}
                loading={query.isFetchingNextPage}
              />
            ) : undefined
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ screen: { flex: 1 } });
