import React, { useMemo, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import GradientBorderView from "@/src/components/common/GradientBorderView";
import InfoPillGradient from "@/src/components/common/chips/InfoPillGradient";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { EnrichedMatchDTO, LiveProvider, PROVIDER_LABELS } from "@/src/types/Match";
import MatchLiveLinkReportFormSheet from "@/src/components/match/form/MatchLiveLinkReportFormSheet";
import MatchLiveLinkFormSheet from "./form/MatchLiveLinkFormSheet";
import MatchLiveLinkDeleteFormSheet from "./form/MatchLiveLinkDeleteFormSheet";
import { useSession } from "@/src/context/SessionProvider";
import { withAlpha } from "@/src/utils/utils";
import useHasScopes from "@/src/hooks/user/useHasScopes";

type Props = {
    enrichedMatch: EnrichedMatchDTO;
    gradient: readonly [string, string, ...string[]];
    refetch: () => void;
    canCreateLiveLinkScope: boolean;
    onOpenSupport: () => void;
    onRequireAuth: () => void;
};

const RADIUS = 18;

const MatchLiveLinkCard: React.FC<Props> = ({
    enrichedMatch,
    gradient,
    refetch,
    canCreateLiveLinkScope,
    onOpenSupport,
    onRequireAuth,
}) => {
    const theme = useAppTheme();

    const reportSheetRef = useRef<BottomSheetModal>(null);
    const editSheetRef = useRef<BottomSheetModal>(null);
    const deleteSheetRef = useRef<BottomSheetModal>(null);

    const { allowed: canDeleteLiveLinkScope } = useHasScopes(["delete:match_live_link"]);
    const { allowed: canReportLiveLinkScope } = useHasScopes(["report:match_live_link"]);

    const { customUser, isGuest } = useSession();

    const hasLiveLink = !!enrichedMatch.liveUrl;
    const isFinished = enrichedMatch.status === "FINISHED";
    const isLive = hasLiveLink && !isFinished;
    const isFinalLocked = !!enrichedMatch.liveEditLocked;

    const isOwner = useMemo(() => {
        if (!customUser?.auth0Id || !enrichedMatch.liveOwnerAuth0Id) {
            return false;
        }
        return enrichedMatch.liveOwnerAuth0Id === customUser.auth0Id;
    }, [customUser?.auth0Id, enrichedMatch.liveOwnerAuth0Id]);

    const canCreateLiveLink =
        !hasLiveLink &&
        canCreateLiveLinkScope &&
        (!isFinished || !isFinalLocked);

    const canEditExistingLink =
        hasLiveLink &&
        isOwner &&
        canCreateLiveLinkScope &&
        (!isFinished || !isFinalLocked);

    const canDeleteLiveLink = hasLiveLink && isOwner && canDeleteLiveLinkScope;

    const canReportLiveLink =
        hasLiveLink && !isOwner && canReportLiveLinkScope;

    const canShowReportButton =
        hasLiveLink && !isOwner;

    const isFinalPostMatchEdit =
        hasLiveLink && isFinished && isOwner && !isFinalLocked;

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
        if (!canShowReportButton) return;

        if (canReportLiveLink) {
            // Utilisateur avec scope : on ouvre la sheet de report
            await handleOpenReportSheet();
        } else if (isGuest) {
            // Invité : on lui propose de créer un compte
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            onRequireAuth();
        }
        // Cas "connecté sans scope" : pour l'instant, on ne fait rien
    };

    const handleOpenLive = async () => {
        if (!enrichedMatch.liveUrl) return;
        try {
            await Haptics.selectionAsync();
            const canOpen = await Linking.canOpenURL(enrichedMatch.liveUrl);
            if (canOpen) {
                await Linking.openURL(enrichedMatch.liveUrl);
            }
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
            return "Ajouter un lien vers la rediffusion";
        }
        return "Vous diffusez ce match ?";
    }, [isFinished]);

    const headerTitle = isFinished ? "Rediffusion" : "Live";

    const showRemovedWarning =
        !hasLiveLink && isFinished && isFinalLocked;

    const canShowEmptyStateCta =
        !hasLiveLink && (!isFinished || !isFinalLocked);

    const shouldShowCard =
        hasLiveLink || canShowEmptyStateCta || showRemovedWarning;

    if (!shouldShowCard) {
        return null;
    }

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

                    {canShowReportButton && (
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
                    {showRemovedWarning && (
                        <View
                            style={[
                                styles.warningBox,
                                {
                                    backgroundColor: withAlpha(
                                        theme.warning,
                                        0.12,
                                    ),
                                    borderColor: theme.warning,
                                },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="alert-circle-outline"
                                size={18}
                                color={theme.warning}
                            />
                            <Text
                                style={[
                                    styles.warningText,
                                    { color: theme.text },
                                ]}
                            >
                                La rediffusion pour ce match a été retirée après trop de signalements.{" "}
                                <Text
                                    style={[
                                        styles.warningLink,
                                        {
                                            color: theme.warning,
                                        },
                                    ]}
                                    onPress={onOpenSupport}
                                >
                                    Contacte le support
                                </Text>
                                .
                            </Text>
                        </View>
                    )}

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
                                                        backgroundColor: withAlpha(
                                                            theme.error,
                                                            0.1,
                                                        ),
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

                            {isFinalPostMatchEdit && (
                                <View
                                    style={[
                                        styles.finalEditHint,
                                        {
                                            backgroundColor: withAlpha(
                                                theme.warning,
                                                0.08,
                                            ),
                                        },
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name="lock-alert-outline"
                                        size={16}
                                        color={theme.warning}
                                    />
                                    <Text
                                        style={[
                                            styles.finalEditText,
                                            { color: theme.text },
                                        ]}
                                    >
                                        Dernière chance : modifier ce lien va
                                        verrouiller définitivement la rediffusion.
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {!hasLiveLink && !showRemovedWarning && canShowEmptyStateCta && (
                        <View style={styles.addPillWrap}>
                            <InfoPillGradient
                                leftIcon="plus-circle-outline"
                                rightIcon="chevron-forward-outline"
                                label={emptyStateLabel}
                                gradient={[theme.borderSecondary, theme.border]}
                                variant="border"
                                onPress={canCreateLiveLink ? handleOpenEdit : onRequireAuth}
                            />
                        </View>
                    )}
                </View>
            </GradientBorderView>

            {canCreateLiveLinkScope && (
                <MatchLiveLinkFormSheet
                    ref={editSheetRef}
                    matchId={enrichedMatch.id}
                    initialUrl={enrichedMatch.liveUrl}
                    isFinalPostMatchEdit={isFinalPostMatchEdit}
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
                        refetch();
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
    warningBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
    },
    warningText: {
        flex: 1,
        fontSize: 12,
        fontWeight: "500",
    },
    warningLink: {
        fontWeight: "700",
        textDecorationLine: "underline",
    },
    finalEditHint: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    finalEditText: {
        fontSize: 11,
        fontWeight: "600",
        flex: 1,
    },
});