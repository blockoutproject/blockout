import React, { useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import { GradientPill, Pill } from "@/src/shared/ui/pill";
import { iconSize, useAppTheme } from "@/src/shared/theme";
import { IconAction } from "@/src/shared/ui/icon-action";
import { MatchResponse } from "@/src/shared/generated/models";
import MatchLiveLinkReportFormSheet from "@/src/modules/match/ui/match-live-link-report-form-sheet";
import MatchLiveLinkFormSheet from "@/src/modules/match/ui/match-live-link-form-sheet";
import MatchLiveLinkDeleteFormSheet from "@/src/modules/match/ui/match-live-link-delete-form-sheet";
import { useSessionState } from "@/src/modules/session/providers/session-context";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";
import { useWebLinkInterstitial } from "@/src/modules/advertising/hooks/use-web-link-interstitial";
import { createMatchLiveLinkCardPresentation } from "@/src/modules/match/view-models/match-live-link-card-presentation";

type Props = {
  match: MatchResponse;
  gradient: readonly [string, string, ...string[]];
  refetch: () => void;
  onRequireAuth: () => void;
};

const RADIUS = 18;

const MatchLiveLinkCard: React.FC<Props> = ({
  match,
  gradient,
  refetch,
  onRequireAuth,
}) => {
  const theme = useAppTheme();
  const { openLinkWithInterstitial } = useWebLinkInterstitial();

  const reportSheetRef = useRef<BottomSheetModal>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const deleteSheetRef = useRef<BottomSheetModal>(null);

  const { allowed: canDeleteLiveLinkScope } = useHasScopes([
    "delete:match_live_link",
  ]);
  const { allowed: canReportLiveLinkScope } = useHasScopes([
    "report:match_live_link",
  ]);
  const { allowed: canCreateLiveLinkScope } = useHasScopes([
    "create:match_live_link",
  ]);
  const { allowed: canModerateLiveLinkScope } = useHasScopes([
    "moderate:match_live_link",
  ]);

  const { customUser, isGuest } = useSessionState();

  const presentation = useMemo(
    () =>
      createMatchLiveLinkCardPresentation({
        isGuest,
        match,
        scopes: {
          canCreate: canCreateLiveLinkScope,
          canDelete: canDeleteLiveLinkScope,
          canModerate: canModerateLiveLinkScope,
          canReport: canReportLiveLinkScope,
        },
        userAuth0Id: customUser?.auth0Id,
      }),
    [
      canCreateLiveLinkScope,
      canDeleteLiveLinkScope,
      canModerateLiveLinkScope,
      canReportLiveLinkScope,
      customUser?.auth0Id,
      isGuest,
      match,
    ],
  );

  const handleOpenEdit = async () => {
    if (!presentation.canCreateLiveLink && !presentation.canEditExistingLink) {
      return;
    }
    await Haptics.selectionAsync();
    editSheetRef.current?.present();
  };

  const handleOpenDelete = async () => {
    if (!presentation.canDeleteLiveLink) return;
    await Haptics.selectionAsync();
    deleteSheetRef.current?.present();
  };

  const handleOpenReportSheet = async () => {
    if (!presentation.canReportLiveLink) return;
    await Haptics.selectionAsync();
    reportSheetRef.current?.present();
  };

  const handlePressReportButton = async () => {
    if (!presentation.showReportButton) return;

    if (presentation.canReportLiveLink) {
      await handleOpenReportSheet();
    } else if (isGuest) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
      onRequireAuth();
    }
  };

  const handleOpenLive = async () => {
    if (!match.liveUrl) return;
    await Haptics.selectionAsync().catch(() => {});
    openLinkWithInterstitial(match.liveUrl);
  };

  if (!presentation.shouldShowCard) return null;

  return (
    <>
      <GradientBorderView
        gradient={gradient}
        borderRadius={RADIUS}
        borderWidth={1}
        style={[styles.card, { backgroundColor: theme.background }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>
              {presentation.headerTitle}
            </Text>
            {!!presentation.isLive && (
              <View
                style={[styles.liveDot, { backgroundColor: theme.error }]}
              />
            )}
          </View>

          {!!presentation.showReportButton && (
            <Pill
              accessibilityLabel="Signaler le lien du match"
              onPress={handlePressReportButton}
              label="Signaler"
              leftIcon="flag-outline"
              size="md"
              borderWidth={0}
              backgroundColor="transparent"
              textColor={theme.textInactive}
              iconColor={theme.textInactive}
              testID="match-live-report-action"
            />
          )}
        </View>

        <View style={styles.content}>
          {!!presentation.hasLiveLink && (
            <View style={styles.liveBlock}>
              <View style={styles.livePillRow}>
                <View style={styles.livePillWrap}>
                  <GradientPill
                    leftIcon={presentation.leftIcon}
                    rightIcon="chevron-forward-outline"
                    label={presentation.liveLabel}
                    gradient={gradient}
                    treatment="filled"
                    onPress={handleOpenLive}
                    accessibilityLabel={`Ouvrir ${presentation.liveLabel}`}
                    testID="match-live-open-action"
                  />
                </View>

                {!!(
                  presentation.canEditExistingLink ||
                  presentation.canDeleteLiveLink
                ) && (
                  <View style={styles.actionsRow}>
                    {!!presentation.canEditExistingLink && (
                      <IconAction
                        accessibilityLabel="Modifier le lien du match"
                        onPress={handleOpenEdit}
                        treatment="surface"
                        testID="match-live-edit-action"
                      >
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={iconSize.sm}
                          color={theme.text}
                        />
                      </IconAction>
                    )}

                    {!!presentation.canDeleteLiveLink && (
                      <IconAction
                        accessibilityLabel="Supprimer le lien du match"
                        onPress={handleOpenDelete}
                        treatment="destructive"
                        testID="match-live-delete-action"
                      >
                        <MaterialCommunityIcons
                          name="delete-outline"
                          size={iconSize.sm}
                          color={theme.error}
                        />
                      </IconAction>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {!presentation.hasLiveLink && !!presentation.canShowEmptyStateCta && (
            <View style={styles.addPillWrap}>
              <GradientPill
                leftIcon="plus-circle-outline"
                rightIcon="chevron-forward-outline"
                label={presentation.emptyStateLabel}
                gradient={[theme.borderSecondary, theme.border]}
                treatment="border"
                onPress={
                  presentation.canCreateLiveLink
                    ? handleOpenEdit
                    : onRequireAuth
                }
                accessibilityLabel={presentation.emptyStateLabel}
                testID="match-live-add-action"
              />
            </View>
          )}
        </View>
      </GradientBorderView>

      {!!canCreateLiveLinkScope && (
        <MatchLiveLinkFormSheet
          ref={editSheetRef}
          matchId={match.id}
          isMatchFinished={presentation.isFinished}
          initialUrl={match.liveUrl}
          isBeforeLiveWindow={
            !presentation.isFinished && presentation.isBeforeLiveWindow
          }
          onSuccess={() => {
            refetch();
            editSheetRef.current?.dismiss();
          }}
        />
      )}

      {!!canDeleteLiveLinkScope && (
        <MatchLiveLinkDeleteFormSheet
          ref={deleteSheetRef}
          matchId={match.id}
          liveUrl={match.liveUrl ?? undefined}
          onSuccess={() => {
            refetch();
            deleteSheetRef.current?.dismiss();
          }}
        />
      )}

      {!!canReportLiveLinkScope && (
        <MatchLiveLinkReportFormSheet
          ref={reportSheetRef}
          matchId={match.id}
          onSuccess={() => {
            reportSheetRef.current?.dismiss();
          }}
        />
      )}
    </>
  );
};

export default MatchLiveLinkCard;

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, padding: 14, gap: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  content: { gap: 12 },
  liveBlock: { gap: 8 },
  livePillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  livePillWrap: { flexShrink: 1 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addPillWrap: { alignSelf: "flex-start" },
});
