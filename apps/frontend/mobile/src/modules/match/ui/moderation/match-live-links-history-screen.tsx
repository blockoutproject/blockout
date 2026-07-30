import React, { useCallback, useMemo, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/shared/theme";
import { useApis } from "@/src/shared/providers/api-provider";
import {
  MatchLiveSummaryResponse,
  MatchLiveLinkHistoryResponse,
} from "@/src/shared/generated/models";
import { useMatchLiveLinksHistory } from "@/src/modules/match/hooks/use-match-live-links-history";
import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";
import MatchLiveLinksHistoryItem from "@/src/modules/match/ui/moderation/match-live-links-history-item";
import RemoteEntityList, {
  type RemoteEntityListFeedback,
} from "@/src/shared/ui/entity/remote-entity-list";
import { sortLiveLinkHistory } from "@/src/modules/match/view-models/live-link-moderation";

type MatchLiveLinksHistoryScreenProps = {
  match: MatchLiveSummaryResponse;
};

const EMPTY_LINKS: MatchLiveLinkHistoryResponse[] = [];
const getHistoryLinkKey = (item: MatchLiveLinkHistoryResponse) =>
  String(item.id);

const HISTORY_LIST_FEEDBACK = {
  loadingTestID: "match-live-history-loading",
  error: {
    subtitle: "Impossible de charger l’historique des liens.",
    testID: "match-live-history-error",
    retryTestID: "match-live-history-retry-action",
  },
  empty: {
    title: "Aucun lien trouvé",
    subtitle: "Aucun lien trouvé pour ce match.",
    testID: "match-live-history-empty",
    retryTestID: "match-live-history-empty-retry-action",
  },
} satisfies RemoteEntityListFeedback;

const MatchLiveLinksHistoryScreen: React.FC<
  MatchLiveLinksHistoryScreenProps
> = ({ match }) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { mobile } = useApis();

  const [apiError, setApiError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useMatchLiveLinksHistory(match.id);

  const links = data ?? EMPTY_LINKS;
  const sortedLinks = useMemo(() => sortLiveLinkHistory(links), [links]);

  const teamALabel = match.teamA.shortName ?? match.teamA.name;
  const teamBLabel = match.teamB.shortName ?? match.teamB.name;
  const headerTitle = `${teamALabel} vs ${teamBLabel}`;

  const handleRefresh = useCallback(async () => {
    setApiError(null);
    await refetch();
  }, [refetch]);

  const handleAction = useCallback(
    async (action: () => Promise<void>, errorMessage: string) => {
      try {
        setApiError(null);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await action();
        await refetch();
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      } catch {
        setApiError(errorMessage);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
    },
    [refetch],
  );

  const handleApprove = useCallback(
    async (link: MatchLiveLinkHistoryResponse) => {
      await handleAction(
        () => mobile.matches.approvePendingLiveLink(link.id),
        "Impossible de valider ce lien, réessaie.",
      );
    },
    [mobile, handleAction],
  );

  const handleReject = useCallback(
    async (link: MatchLiveLinkHistoryResponse) => {
      await handleAction(
        () => mobile.matches.rejectPendingLiveLink(link.id),
        "Impossible de rejeter ce lien, réessaie.",
      );
    },
    [mobile, handleAction],
  );

  const handleDeleteActive = useCallback(
    async (_link: MatchLiveLinkHistoryResponse) => {
      await handleAction(
        () => mobile.matches.deleteMatchLiveLink(match.id),
        "Impossible de supprimer ce lien, réessaie.",
      );
    },
    [mobile, match.id, handleAction],
  );

  const handleReactivate = useCallback(
    async (link: MatchLiveLinkHistoryResponse) => {
      await handleAction(
        () => mobile.matches.reactivateLiveLink(link.id),
        "Impossible de réactiver ce lien, réessaie.",
      );
    },
    [mobile, handleAction],
  );

  const renderItem = useCallback(
    ({ item }: { item: MatchLiveLinkHistoryResponse }) => (
      <MatchLiveLinksHistoryItem
        link={item}
        onApprove={handleApprove}
        onReject={handleReject}
        onDeleteActive={handleDeleteActive}
        onReactivate={handleReactivate}
      />
    ),
    [handleApprove, handleDeleteActive, handleReactivate, handleReject],
  );

  return (
    <>
      <View
        style={[styles.container, { backgroundColor: theme.background }]}
        testID="match-live-history-screen"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.textInactive }]}
            numberOfLines={2}
          >
            Historique des liens live / rediffusion pour ce match.
          </Text>
        </View>

        <RemoteEntityList
          data={sortedLinks}
          feedback={HISTORY_LIST_FEEDBACK}
          footerSpacing={16}
          includeBottomNavigationSpacing={false}
          isError={false}
          isLoading={Boolean(isLoading && !data)}
          keyExtractor={getHistoryLinkKey}
          contentContainerStyle={{
            paddingHorizontal: 8,
            paddingTop: 8,
          }}
          onRefresh={handleRefresh}
          refreshHapticStyle={Haptics.ImpactFeedbackStyle.Light}
          renderItem={renderItem}
          onScrollBeginDrag={Keyboard.dismiss}
          scrollWhenEmpty
          showEmptyRetry={false}
          testID="match-live-history-list"
        />
      </View>

      <ApiErrorToast
        bottomOffset={insets.bottom}
        message={apiError}
        onHidden={() => setApiError(null)}
      />
    </>
  );
};

export default MatchLiveLinksHistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
});
