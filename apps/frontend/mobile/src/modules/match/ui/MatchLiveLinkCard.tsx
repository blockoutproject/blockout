import React, {useMemo, useRef} from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import * as Haptics from "expo-haptics";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {BottomSheetModal} from "@gorhom/bottom-sheet";

import GradientBorderView from "@/src/shared/ui/GradientBorderView";
import InfoPillGradient from "@/src/shared/ui/chips/InfoPillGradient";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {MatchResponse, LiveProvider, MatchStatus, PROVIDER_LABELS,} from "@/src/modules/match/model/Match";
import MatchLiveLinkReportFormSheet from "@/src/modules/match/ui/form/MatchLiveLinkReportFormSheet";
import MatchLiveLinkFormSheet from "./form/MatchLiveLinkFormSheet";
import MatchLiveLinkDeleteFormSheet from "./form/MatchLiveLinkDeleteFormSheet";
import {useSessionState} from "@/src/modules/session/providers/SessionContext";
import useHasScopes from "@/src/modules/user/hooks/useHasScopes";
import {useWebLinkInterstitial} from "@/src/modules/advertising/useWebLinkInterstitial";

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
  const {openLinkWithInterstitial} = useWebLinkInterstitial();

  const reportSheetRef = useRef<BottomSheetModal>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const deleteSheetRef = useRef<BottomSheetModal>(null);

  const {allowed: canDeleteLiveLinkScope} = useHasScopes([
    "delete:match_live_link",
  ]);
  const {allowed: canReportLiveLinkScope} = useHasScopes([
    "report:match_live_link",
  ]);
  const {allowed: canCreateLiveLinkScope} = useHasScopes([
    "create:match_live_link",
  ]);
  const {allowed: canModerateLiveLinkScope} = useHasScopes([
    "moderate:match_live_link",
  ]);

  const {customUser, isGuest} = useSessionState();

  const hasLiveLink = !!match.liveUrl;
  const isFinished = match.status === MatchStatus.FINISHED;
  const isLive = hasLiveLink && !isFinished;

  const isOwner = useMemo(() => {
    if (!customUser?.auth0Id || !match.liveOwnerAuth0Id) return false;
    return match.liveOwnerAuth0Id === customUser.auth0Id;
  }, [customUser?.auth0Id, match.liveOwnerAuth0Id]);

  const matchDate = useMemo(
    () =>
      match.matchDate ? new Date(match.matchDate) : null,
    [match.matchDate],
  );

  const isBeforeLiveWindow = useMemo(() => {
    if (!matchDate) return false;
    const now = new Date();
    const oneHourBefore = new Date(matchDate.getTime() - 60 * 60 * 1000);
    return now < oneHourBefore;
  }, [matchDate]);

  const canCreateLiveLink = !hasLiveLink && canCreateLiveLinkScope;

  const canEditExistingLink =
    hasLiveLink &&
    (canModerateLiveLinkScope || (isOwner && canCreateLiveLinkScope));

  const canDeleteLiveLink =
    hasLiveLink &&
    (canModerateLiveLinkScope || (isOwner && canDeleteLiveLinkScope));

  const canReportLiveLink = hasLiveLink && !isOwner && canReportLiveLinkScope;
  const showReportButton = canReportLiveLink || (hasLiveLink && isGuest);

  const providerLabel = useMemo(() => {
    if (!match.liveProvider) return "";
    const key = match.liveProvider as LiveProvider;
    return PROVIDER_LABELS[key] ?? "";
  }, [match.liveProvider]);

  const leftIcon = useMemo(() => {
    switch (match.liveProvider as LiveProvider | null) {
      case "YOUTUBE":
        return "youtube";
      case "TWITCH":
        return "twitch";
      case "FACEBOOK":
        return "facebook";
      default:
        return "play-circle-outline";
    }
  }, [match.liveProvider]);

  const handleOpenEdit = async () => {
    if (!canCreateLiveLink && !canEditExistingLink) return;
    await Haptics.selectionAsync();
    editSheetRef.current?.present();
  };

  const handleOpenDelete = async () => {
    if (!canDeleteLiveLink) return;
    await Haptics.selectionAsync();
    deleteSheetRef.current?.present();
  };

  const handleOpenReportSheet = async () => {
    if (!canReportLiveLink) return;
    await Haptics.selectionAsync();
    reportSheetRef.current?.present();
  };

  const handlePressReportButton = async () => {
    if (!showReportButton) return;

    if (canReportLiveLink) {
      await handleOpenReportSheet();
    } else if (isGuest) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {
      });
      onRequireAuth();
    }
  };

  const handleOpenLive = async () => {
    if (!match.liveUrl) return;
    await Haptics.selectionAsync().catch(() => {
    });
    openLinkWithInterstitial(match.liveUrl);
  };

  const liveLabel = useMemo(() => {
    if (isFinished) return "Regarder la rediffusion";
    if (providerLabel) return `Regarder le live sur ${providerLabel}`;
    return "Regarder le live";
  }, [isFinished, providerLabel]);

  const emptyStateLabel = useMemo(
    () =>
      isFinished ? "Ajouter un lien de rediffusion" : "Vous diffusez ce match ?",
    [isFinished],
  );

  const canShowEmptyStateCta = !hasLiveLink && (canCreateLiveLink || isGuest);
  const shouldShowCard = hasLiveLink || canShowEmptyStateCta;

  if (!shouldShowCard) return null;

  const headerTitle = isFinished ? "Rediffusion" : "Live";

  return (
    <>
      <GradientBorderView
        gradient={gradient}
        borderRadius={RADIUS}
        borderWidth={1}
        style={[styles.card, {backgroundColor: theme.background}]}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, {color: theme.text}]}>
              {headerTitle}
            </Text>
            {!!isLive && (
              <View
                style={[styles.liveDot, {backgroundColor: theme.error}]}
              />
            )}
          </View>

          {!!showReportButton && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Signaler le lien du match"
              onPress={handlePressReportButton}
              style={styles.reportBtn}
              testID="match-live-report-action"
            >
              <MaterialCommunityIcons
                name="flag-outline"
                size={18}
                color={theme.textInactive}
              />
              <Text
                style={[styles.reportText, {color: theme.textInactive}]}
              >
                Signaler
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          {!!hasLiveLink && (
            <View style={styles.liveBlock}>
              <View style={styles.livePillRow}>
                <View style={styles.livePillWrap}>
                  <InfoPillGradient
                    leftIcon={leftIcon}
                    rightIcon="chevron-forward-outline"
                    label={liveLabel}
                    gradient={gradient}
                    variant="filled"
                    onPress={handleOpenLive}
                    accessibilityLabel={`Ouvrir ${liveLabel}`}
                    testID="match-live-open-action"
                  />
                </View>

                {!!(canEditExistingLink || canDeleteLiveLink) && (
                  <View style={styles.actionsRow}>
                    {!!canEditExistingLink && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Modifier le lien du match"
                        onPress={handleOpenEdit}
                        style={[
                          styles.iconChip,
                          {
                            borderColor: theme.border,
                            backgroundColor: theme.surface,
                          },
                        ]}
                        testID="match-live-edit-action"
                      >
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={16}
                          color={theme.text}
                        />
                      </TouchableOpacity>
                    )}

                    {!!canDeleteLiveLink && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Supprimer le lien du match"
                        onPress={handleOpenDelete}
                        style={[
                          styles.iconChip,
                          {
                            borderColor: theme.error,
                            backgroundColor: theme.error + "1A",
                          },
                        ]}
                        testID="match-live-delete-action"
                      >
                        <MaterialCommunityIcons
                          name="delete-outline"
                          size={16}
                          color={theme.error}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {!hasLiveLink && !!canShowEmptyStateCta && (
            <View style={styles.addPillWrap}>
              <InfoPillGradient
                leftIcon="plus-circle-outline"
                rightIcon="chevron-forward-outline"
                label={emptyStateLabel}
                gradient={[theme.borderSecondary, theme.border]}
                variant="border"
                onPress={
                  canCreateLiveLink ? handleOpenEdit : onRequireAuth
                }
                accessibilityLabel={emptyStateLabel}
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
          isMatchFinished={isFinished}
          initialUrl={match.liveUrl}
          isBeforeLiveWindow={!isFinished && isBeforeLiveWindow}
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
  card: {borderRadius: RADIUS, padding: 14, gap: 16},
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {flexDirection: "row", alignItems: "center", gap: 6},
  title: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  liveDot: {width: 8, height: 8, borderRadius: 4},
  reportBtn: {flexDirection: "row", alignItems: "center", gap: 6},
  reportText: {fontSize: 12, fontWeight: "600"},
  content: {gap: 12},
  liveBlock: {gap: 8},
  livePillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  livePillWrap: {flexShrink: 1},
  actionsRow: {flexDirection: "row", alignItems: "center", gap: 8},
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addPillWrap: {alignSelf: "flex-start"},
});
