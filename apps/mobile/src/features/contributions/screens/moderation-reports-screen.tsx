import { useNavigation } from "expo-router";
import { RefreshCw } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { Button } from "../../../shared/components/button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { EntryGroupSeparator } from "../../../shared/components/entry-group";
import {
  Page,
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { PageList } from "../../../shared/components/page-list";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { EmptyState, ErrorState } from "../../../shared/components/state-card";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { AccountSessionFeedback } from "../../accounts/current-account";
import { useModerationReports } from "../api/moderation";
import { ModerationReportsLoading } from "../components/moderation-loading";
import { moderationTime } from "../model/moderation-presentation";

/** The active editor or a proposed/historical version supplies its exact match and version. */
export interface ModerationReportsScreenProps {
  matchId: string;
  versionId: string;
}

/** Reads private reports above the mounted caller; Query owns traversal, cancellation and retained authorized pages. */
export function ModerationReportsScreen({
  matchId,
  versionId,
}: ModerationReportsScreenProps) {
  const reading = useModerationReports(matchId, versionId, true);
  const { query } = reading;
  const navigation = useNavigation();
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const denied = isAccessDenied(query.error);
  const pages = reading.canRetain && !denied ? query.data?.pages : undefined;
  // A report may cross page boundaries; keep its first position and most recently received representation.
  const reports = [
    ...new Map(
      (pages ?? [])
        .flatMap((page) => page.items)
        .map((report) => [report.id, report]),
    ).values(),
  ];
  const pending =
    reading.session.status === "restoring" ||
    reading.profile.isLoading ||
    (reading.allowed && query.isLoading);
  const FeedbackLayout = pending ? PageContent : ScreenState;
  const refreshable = reading.allowed && reports.length > 0;

  /** A native pull rereads this traversal; usable rows survive a technical failure with one gesture-owned notice. */
  async function refresh() {
    if (!reading.allowed || query.isFetching) {
      return;
    }
    feedback.clear();
    const result = await query.refetch({ cancelRefetch: false });
    if (result.isError && reports.length > 0 && !isAccessDenied(result.error)) {
      feedback.error();
    }
  }

  /** Automatic edges and explicit append Retry share Query's current next page; failed edges never retry themselves. */
  async function loadMore() {
    if (
      !reading.allowed ||
      !navigation.isFocused() ||
      denied ||
      !query.hasNextPage ||
      query.isFetching
    ) {
      return;
    }
    feedback.clear();
    await query.fetchNextPage({ cancelRefetch: false });
  }

  /** Recovers exact-version report admission before interpreting empty results. */
  function renderEmptyState() {
    if (reading.session.status !== "authenticated") {
      return (
        <AccountSessionFeedback loadingContent={<ModerationReportsLoading />} />
      );
    }
    if ((!reading.canRetain && reading.profile.isSuccess) || denied) {
      return <ErrorState />;
    }
    if (
      !pages ||
      query.isError ||
      reading.profile.isError ||
      reading.profile.isPending
    ) {
      return (
        <ReadFeedback
          query={
            reading.profile.isError || reading.profile.isPending
              ? reading.profile
              : query
          }
          loadingContent={<ModerationReportsLoading />}
        />
      );
    }
    return (
      <EmptyState title="Aucun signalement">
        <Button
          label="Actualiser"
          leadingIcon={RefreshCw}
          disabled={!reading.allowed}
          loading={query.isFetching}
          onPress={() => void query.refetch({ cancelRefetch: false })}
        />
      </EmptyState>
    );
  }

  return (
    <Page header={<PageHeader title="Signalements" />}>
      {reports.length === 0 ? (
        <PageScrollView>
          <FeedbackLayout>{renderEmptyState()}</FeedbackLayout>
        </PageScrollView>
      ) : (
        <PageList
          {...hiddenScrollIndicators}
          testID="moderation-reports-list"
          data={reports}
          extraData={colors}
          keyExtractor={(report) => report.id}
          contentContainerStyle={pageContentStyle}
          alwaysBounceVertical={refreshable}
          refreshControl={
            refreshable ? (
              <DataRefreshControl
                enabled={!query.isFetchingNextPage}
                onRefresh={refresh}
              />
            ) : undefined
          }
          onEndReached={() => {
            if (!query.isError) {
              void loadMore();
            }
          }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            reports.length ? (
              <View style={styles.header}>
                <Text
                  accessibilityRole="header"
                  style={[tokens.typography.navigation, { color: colors.text }]}
                >
                  Signalements ({pages?.at(-1)?.count})
                </Text>
                {reading.profile.isError && (
                  <Button
                    label="Réessayer le profil"
                    loading={reading.profile.isFetching}
                    onPress={() => void reading.profile.refetch()}
                  />
                )}
              </View>
            ) : undefined
          }
          ItemSeparatorComponent={EntryGroupSeparator}
          renderItem={({ item }) => (
            <View style={styles.report}>
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                {moderationTime(item.reportedAt)}
              </Text>
              <Text style={[styles.reason, { color: colors.text }]}>
                {item.reason ?? "Motif indisponible"}
              </Text>
            </View>
          )}
          ListFooterComponent={
            <>
              {reports.length > 0 &&
                (query.isFetchingNextPage || query.isError) && (
                  <View style={styles.footer}>
                    <ListContinuation
                      loading={query.isFetchingNextPage}
                      failed={query.isError}
                      disabled={!reading.allowed || query.isFetching}
                      onRetry={() =>
                        void (query.isFetchNextPageError
                          ? loadMore()
                          : query.refetch({ cancelRefetch: false }))
                      }
                    />
                  </View>
                )}
              <BottomContentSpacer />
            </>
          }
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { gap: tokens.spacing.lg, paddingBottom: tokens.spacing.lg },
  report: { paddingVertical: tokens.spacing.md, gap: tokens.spacing.xs },
  reason: {
    ...tokens.typography.body,
    lineHeight: tokens.typography.body.fontSize * 1.55,
  },
  footer: { paddingTop: tokens.spacing.lg },
});
