import React, { useMemo, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import GradientBorderView from "@/src/components/common/GradientBorderView";
import InfoPillGradient from "@/src/components/common/chips/InfoPillGradient";
import { useAppTheme } from "@/src/context/ThemeProvider";
import {
    EnrichedMatchDTO,
    LiveProvider,
    MatchStatus,
    PROVIDER_LABELS,
} from "@/src/types/Match";
import MatchLiveLinkReportFormSheet from "@/src/components/match/form/MatchLiveLinkReportFormSheet";
import MatchLiveLinkFormSheet from "./form/MatchLiveLinkFormSheet";
import MatchLiveLinkDeleteFormSheet from "./form/MatchLiveLinkDeleteFormSheet";
import { useSession } from "@/src/context/SessionProvider";
import useHasScopes from "@/src/hooks/user/useHasScopes";

type Props = {
    enrichedMatch: EnrichedMatchDTO;
    gradient: readonly [string, string, ...string[]];
    refetch: () => void;
    onRequireAuth: () => void;
};

const RADIUS = 18;

const MatchLiveLinkCard: React.FC<Props> = ({
    enrichedMatch,
    gradient,
    refetch,
    onRequireAuth,
}) => {
    const theme = useAppTheme();

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

    const { customUser, isGuest } = useSession();

    const hasLiveLink = !!enrichedMatch.liveUrl;
    const isFinished = enrichedMatch.status === MatchStatus.FINISHED;
    const isLive = hasLiveLink && !isFinished;

    const isOwner = useMemo(() => {
        if (!customUser?.auth0Id || !enrichedMatch.liveOwnerAuth0Id) {
            return false;
        }
        return enrichedMatch.liveOwnerAuth0Id === customUser.auth0Id;
    }, [customUser?.auth0Id, enrichedMatch.liveOwnerAuth0Id]);

    const matchDate = useMemo(() => {
        return enrichedMatch.matchDate ? new Date(enrichedMatch.matchDate) : null;
    }, [enrichedMatch.matchDate]);

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
        if (!enrichedMatch.liveProvider) return "";
        const key = enrichedMatch.liveProvider as LiveProvider;
        return PROVIDER_LABELS[key] ?? "";
    }, [enrichedMatch.liveProvider]);

    const leftIcon = useMemo(() => {
        switch (enrichedMatch.liveProvider as LiveProvider | null) {
            case "YOUTUBE":
                return "youtube";
            case "TWITCH":
                return "twitch";
            case "FACEBOOK":
                return "facebook";
            default:
                return "play-circle-outline";
        }
    }, [enrichedMatch.liveProvider]);

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
            ).catch(() => {});
            onRequireAuth();
        }
    };

    const handleOpenLive = async () => {
        if (!enrichedMatch.liveUrl) return;

        try {
            await Haptics.selectionAsync();
            await Linking.openURL(enrichedMatch.liveUrl);
        } catch {
            // ignore
        }
    };

    const liveLabel = useMemo(() => {
        if (isFinished) {
            return "Regarder la rediffusion";
        }
        if (providerLabel) {
            return `Regarder le live sur ${providerLabel}`;
        }
        return "Regarder le live";
    }, [isFinished, providerLabel]);

    const emptyStateLabel = useMemo(() => {
        if (isFinished) {
            return "Ajouter un lien de rediffusion";
        }
        return "Vous diffusez ce match ?";
    }, [isFinished]);

    const canShowEmptyStateCta = !hasLiveLink && (canCreateLiveLink || isGuest);
    const shouldShowCard = hasLiveLink || canShowEmptyStateCta;

    if (!shouldShowCard) {
        return null;
    }

    const headerTitle = isFinished ? "Rediffusion" : "Live";

    return (
        <>
            <GradientBorderView
                gradient={gradient}
                borderRadius={RADIUS}
                borderWidth={1}
                style={[
                    styles.card,
                    {
                        backgroundColor: theme.background,
                    },
                ]}
            >
                <View style={styles.headerRow}>
                    <View style={styles.titleRow}>
                        <Text
                            style={[
                                styles.title,
                                {
                                    color: theme.text,
                                },
                            ]}
                        >
                            {headerTitle}
                        </Text>
                        {isLive && (
                            <View
                                style={[
                                    styles.liveDot,
                                    { backgroundColor: theme.error },
                                ]}
                            />
                        )}
                    </View>

                    {showReportButton && (
                        <TouchableOpacity
                            onPress={handlePressReportButton}
                            style={styles.reportBtn}
                        >
                            <MaterialCommunityIcons
                                name="flag-outline"
                                size={18}
                                color={theme.textInactive}
                            />
                            <Text
                                style={[
                                    styles.reportText,
                                    { color: theme.textInactive },
                                ]}
                            >
                                Signaler
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.content}>
                    {hasLiveLink && (
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
                                    />
                                </View>

                                {(canEditExistingLink || canDeleteLiveLink) && (
                                    <View style={styles.actionsRow}>
                                        {canEditExistingLink && (
                                            <TouchableOpacity
                                                onPress={handleOpenEdit}
                                                style={[
                                                    styles.iconChip,
                                                    {
                                                        borderColor: theme.border,
                                                        backgroundColor:
                                                            theme.surface,
                                                    },
                                                ]}
                                            >
                                                <MaterialCommunityIcons
                                                    name="pencil-outline"
                                                    size={16}
                                                    color={theme.text}
                                                />
                                            </TouchableOpacity>
                                        )}

                                        {canDeleteLiveLink && (
                                            <TouchableOpacity
                                                onPress={handleOpenDelete}
                                                style={[
                                                    styles.iconChip,
                                                    {
                                                        borderColor: theme.error,
                                                        backgroundColor:
                                                            theme.error + "1A",
                                                    },
                                                ]}
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

                    {!hasLiveLink && canShowEmptyStateCta && (
                        <View style={styles.addPillWrap}>
                            <InfoPillGradient
                                leftIcon="plus-circle-outline"
                                rightIcon="chevron-forward-outline"
                                label={emptyStateLabel}
                                gradient={[theme.borderSecondary, theme.border]}
                                variant="border"
                                onPress={
                                    canCreateLiveLink
                                        ? handleOpenEdit
                                        : onRequireAuth
                                }
                            />
                        </View>
                    )}

                    {isFinished && (
                        <View
                            style={[
                                styles.moderationBox,
                                {
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.moderationHint,
                                    { color: theme.textInactive },
                                ]}
                            >
                                Les rediffusions sont vérifiées avant d’être
                                visibles sur la fiche du match.
                            </Text>
                        </View>
                    )}

                    {!isFinished && hasLiveLink && !isOwner && (
                        <View
                            style={[
                                styles.moderationBox,
                                {
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.moderationHint,
                                    { color: theme.textInactive },
                                ]}
                            >
                                Les liens de live sont publiés par la
                                communauté et ne sont pas toujours vérifiés. Si
                                le lien est incorrect, tu peux{" "}
                                <Text
                                    style={[
                                        styles.moderationLink,
                                        { color: theme.warning },
                                    ]}
                                    onPress={handlePressReportButton}
                                >
                                    le signaler
                                </Text>
                                .
                            </Text>
                        </View>
                    )}
                </View>
            </GradientBorderView>

            {canCreateLiveLinkScope && (
                <MatchLiveLinkFormSheet
                    ref={editSheetRef}
                    matchId={enrichedMatch.id}
                    isMatchFinished={isFinished}
                    initialUrl={enrichedMatch.liveUrl}
                    isBeforeLiveWindow={!isFinished && isBeforeLiveWindow}
                    onSuccess={() => {
                        refetch();
                        editSheetRef.current?.dismiss();
                    }}
                />
            )}

            {canDeleteLiveLinkScope && (
                <MatchLiveLinkDeleteFormSheet
                    ref={deleteSheetRef}
                    matchId={enrichedMatch.id}
                    liveUrl={enrichedMatch.liveUrl ?? undefined}
                    onSuccess={() => {
                        refetch();
                        deleteSheetRef.current?.dismiss();
                    }}
                />
            )}

            {canReportLiveLinkScope && (
                <MatchLiveLinkReportFormSheet
                    ref={reportSheetRef}
                    matchId={enrichedMatch.id}
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
    card: {
        borderRadius: RADIUS,
        padding: 14,
        gap: 16,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    title: {
        fontSize: 14,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    reportBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    reportText: {
        fontSize: 12,
        fontWeight: "600",
    },
    content: {
        gap: 12,
    },
    liveBlock: {
        gap: 8,
    },
    livePillRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    livePillWrap: {
        flexShrink: 1,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    iconChip: {
        width: 32,
        height: 32,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    addPillWrap: {
        alignSelf: "flex-start",
    },
    moderationBox: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderRadius: 14,
        marginTop: 4,
    },
    moderationHint: {
        fontSize: 12,
        fontWeight: "600",
    },
    moderationLink: {
        fontSize: 12,
        fontWeight: "700",
        textDecorationLine: "underline",
    },
});