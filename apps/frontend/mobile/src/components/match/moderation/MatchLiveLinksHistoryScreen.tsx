import React, {useCallback, useMemo, useState} from "react";
import {ActivityIndicator, Keyboard, RefreshControl, StyleSheet, Text, View,} from "react-native";
import {FlashList} from "@shopify/flash-list";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {useApis} from "@/src/shared/providers/ApiProvider";
import {EnrichedMatchLiveSummaryDTO, MatchLiveLinkDTO,} from "@/src/types/Match";
import {useMatchLiveLinksHistory} from "@/src/hooks/match/useMatchLiveLinksHistory";
import ApiErrorToast from "@/src/shared/ui/feedback/ApiErrorToast";
import MatchLiveLinksHistoryItem from "@/src/components/match/moderation/MatchLiveLinksHistoryItem";

type MatchLiveLinksHistoryScreenProps = {
  match: EnrichedMatchLiveSummaryDTO;
};

const MatchLiveLinksHistoryScreen: React.FC<
  MatchLiveLinksHistoryScreenProps
> = ({match}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const {mobile} = useApis();

  const [apiError, setApiError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data,
    isLoading,
    refetch,
  } = useMatchLiveLinksHistory(match.id);

  const links = useMemo<MatchLiveLinkDTO[]>(
    () => data ?? [],
    [data],
  );

  const sortedLinks = useMemo(
    () =>
      links
        .slice()
        .sort((a, b) => {
          const dateA = new Date(a.createdAt ?? 0).getTime();
          const dateB = new Date(b.createdAt ?? 0).getTime();
          return dateB - dateA;
        }),
    [links],
  );

  const teamALabel = match.teamA.shortName ?? match.teamA.name;
  const teamBLabel = match.teamB.shortName ?? match.teamB.name;
  const headerTitle = `${teamALabel} vs ${teamBLabel}`;

  const handleRefresh = useCallback(async () => {
    setApiError(null);
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setIsRefreshing(false);
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
        ).catch(() => {
        });
      } catch {
        setApiError(errorMessage);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        ).catch(() => {
        });
      }
    },
    [refetch],
  );

  const handleApprove = useCallback(
    async (link: MatchLiveLinkDTO) => {
      await handleAction(
        () => mobile.matches.approvePendingLiveLink(link.id),
        "Impossible de valider ce lien, réessaie.",
      );
    },
    [mobile, handleAction],
  );

  const handleReject = useCallback(
    async (link: MatchLiveLinkDTO) => {
      await handleAction(
        () => mobile.matches.rejectPendingLiveLink(link.id),
        "Impossible de rejeter ce lien, réessaie.",
      );
    },
    [mobile, handleAction],
  );

  const handleDeleteActive = useCallback(
    async (_link: MatchLiveLinkDTO) => {
      await handleAction(
        () => mobile.matches.deleteMatchLiveLink(match.id),
        "Impossible de supprimer ce lien, réessaie.",
      );
    },
    [mobile, match.id, handleAction],
  );

  const handleReactivate = useCallback(
    async (link: MatchLiveLinkDTO) => {
      await handleAction(
        () => mobile.matches.reactivateLiveLink(link.id),
        "Impossible de réactiver ce lien, réessaie.",
      );
    },
    [mobile, handleAction],
  );

  if (isLoading && !data) {
    return (
      <>
        <View
          style={[
            styles.center,
            {backgroundColor: theme.background},
          ]}
        >
          <ActivityIndicator size="large" color={theme.text}/>
        </View>
        <ApiErrorToast
          message={apiError}
          onHidden={() => setApiError(null)}
        />
      </>
    );
  }

  return (
    <>
      <View
        style={[styles.container, {backgroundColor: theme.background}]}
      >
        <View style={styles.header}>
          <Text
            style={[styles.title, {color: theme.text}]}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
          <Text
            style={[
              styles.subtitle,
              {color: theme.textInactive},
            ]}
            numberOfLines={2}
          >
            Historique des liens live / rediffusion pour ce match.
          </Text>
        </View>

        <FlashList
          data={sortedLinks}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{
            paddingHorizontal: 8,
            paddingBottom: insets.bottom + 16,
            paddingTop: 8,
          }}
          renderItem={({item}) => (
            <MatchLiveLinksHistoryItem
              link={item}
              onApprove={handleApprove}
              onReject={handleReject}
              onDeleteActive={handleDeleteActive}
              onReactivate={handleReactivate}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.text}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{color: theme.textInactive}}>
                Aucun lien trouvé pour ce match.
              </Text>
            </View>
          }
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 40,
  },
});
