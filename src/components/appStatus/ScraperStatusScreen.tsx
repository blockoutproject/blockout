// ScraperStatusScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useScraperStatuses } from "@/src/hooks/config/scraper/useScraperStatus";
import { useAppStatus } from "@/src/hooks/config/app/useAppStatus";
import { useApis } from "@/src/context/ApiProvider";
import { ScraperStatus } from "@/src/types/ScraperStatus";

import ScraperStatusItem from "./ScraperStatusItem";
import MaintenanceControlCard from "./MaintenanceControlCard";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";

const ScraperStatusScreen: React.FC = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { mobile } = useApis();

    const {
        data: scrapers,
        isLoading: scrapersLoading,
        refetch: refetchScrapers,
    } = useScraperStatuses();

    const {
        data: appStatus,
        isLoading: statusLoading,
        refetch: refetchStatus,
    } = useAppStatus();

    const [maintenanceEnabled, setMaintenanceEnabled] = useState<boolean>(false);
    const [maintenanceMessage, setMaintenanceMessage] = useState<string>("");
    const [maintenanceImageUrl, setMaintenanceImageUrl] = useState<string>("");
    const [savingMaintenance, setSavingMaintenance] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        if (!appStatus) return;
        setMaintenanceEnabled(appStatus.maintenance);
        setMaintenanceMessage(appStatus.message ?? "");
        setMaintenanceImageUrl(appStatus.imageUrl ?? "");
    }, [appStatus?.maintenance, appStatus?.message, appStatus?.imageUrl]);

    const sortedScrapers: ScraperStatus[] = useMemo(() => {
        if (!scrapers) return [];
        return [...scrapers].sort((a, b) => a.name.localeCompare(b.name));
    }, [scrapers]);

    const toggleScraper = useCallback(
        async (scraper: ScraperStatus) => {
            try {
                setApiError(null);
                await Haptics.selectionAsync();
                await mobile.updateScraperStatus(scraper.name, !scraper.enabled);
                await refetchScrapers();
            } catch (error) {
                console.error("Erreur lors du toggle scraper :", error);
                setApiError("Mise à jour du scraper impossible, réessaie.");
                await Haptics
                    .notificationAsync(Haptics.NotificationFeedbackType.Error)
                    .catch(() => {});
            }
        },
        [mobile, refetchScrapers],
    );

    const initialMessage = appStatus?.message ?? "";
    const initialImageUrl = appStatus?.imageUrl ?? "";

    const isDirty =
        maintenanceMessage !== initialMessage ||
        maintenanceImageUrl !== initialImageUrl;

    const handleSaveMaintenance = useCallback(async () => {
        if (savingMaintenance) return;

        const trimmedMessage = maintenanceMessage.trim();
        const trimmedImageUrl = maintenanceImageUrl.trim();

        if (!trimmedMessage) return;

        try {
            setApiError(null);
            setSavingMaintenance(true);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            await mobile.updateAppStatus({
                maintenance: true,
                message: trimmedMessage,
                imageUrl: trimmedImageUrl.length ? trimmedImageUrl : null,
            });

            await refetchStatus();

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error("Erreur lors de la mise à jour du statut de l’app :", error);
            setApiError("Mise à jour de la maintenance impossible, réessaie.");
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } finally {
            setSavingMaintenance(false);
        }
    }, [
        savingMaintenance,
        maintenanceMessage,
        maintenanceImageUrl,
        mobile,
        refetchStatus,
    ]);

    const handleDisableMaintenance = useCallback(async () => {
        if (savingMaintenance) return;

        try {
            setApiError(null);
            setSavingMaintenance(true);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            await mobile.updateAppStatus({
                maintenance: false,
                message: undefined,
                imageUrl: undefined,
            });

            await refetchStatus();

            await Haptics
                .notificationAsync(Haptics.NotificationFeedbackType.Success)
                .catch(() => {});
        } catch (error) {
            console.error("Erreur lors de la désactivation de la maintenance :", error);
            setApiError("Désactivation de la maintenance impossible, réessaie.");
            await Haptics
                .notificationAsync(Haptics.NotificationFeedbackType.Error)
                .catch(() => {});
        } finally {
            setSavingMaintenance(false);
        }
    }, [mobile, refetchStatus, savingMaintenance]);

    const globalLoading = scrapersLoading || statusLoading;

    if (globalLoading && !appStatus && !scrapers) {
        return (
            <>
                <View style={[styles.center, { backgroundColor: theme.backgroundSecondary }]}>
                    <ActivityIndicator size="large" color={theme.text} />
                </View>
                <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
            </>
        );
    }

    const totalScrapers = sortedScrapers.length;
    const enabledCount = sortedScrapers.filter((s) => s.enabled).length;

    return (
        <>
            <BottomSheetScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 16 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerWrapper}>
                    <Text style={[styles.screenTitle, { color: theme.text }]}>
                        Administration technique
                    </Text>

                    <Text style={[styles.screenSubtitle, { color: theme.textInactive }]}>
                        Gérez le mode maintenance global et l’état des scrapers.
                    </Text>
                </View>

                <MaintenanceControlCard
                    maintenanceEnabled={maintenanceEnabled}
                    maintenanceMessage={maintenanceMessage}
                    maintenanceImageUrl={maintenanceImageUrl}
                    lastUpdate={appStatus?.lastUpdate || undefined}
                    loading={globalLoading}
                    isDirty={isDirty}
                    saving={savingMaintenance}
                    onChangeMessage={setMaintenanceMessage}
                    onChangeImageUrl={setMaintenanceImageUrl}
                    onSave={handleSaveMaintenance}
                    onDisable={handleDisableMaintenance}
                />

                <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLeft}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                            Scrapers
                        </Text>
                        <Text style={[styles.sectionSubtitle, { color: theme.textInactive }]}>
                            Activez / désactivez les scrapers un par un.
                        </Text>
                    </View>

                    {totalScrapers > 0 && (
                        <View style={styles.badge}>
                            <Text style={[styles.badgeText, { color: theme.text }]}>
                                {enabledCount}/{totalScrapers} actifs
                            </Text>
                        </View>
                    )}
                </View>

                {sortedScrapers.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={{ color: theme.textInactive }}>
                            Aucun scraper trouvé.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.scraperList}>
                        {sortedScrapers.map((scraper) => (
                            <ScraperStatusItem
                                key={scraper.id}
                                scraper={scraper}
                                onToggle={() => toggleScraper(scraper)}
                            />
                        ))}
                    </View>
                )}
            </BottomSheetScrollView>

            <ApiErrorToast
                bottomOffset={insets.bottom}
                message={apiError}
                onHidden={() => setApiError(null)}
            />
        </>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingTop: 8,
        paddingHorizontal: 12,
        gap: 16,
    },
    headerWrapper: {
        gap: 8,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: "800",
    },
    screenSubtitle: {
        fontSize: 13,
        fontWeight: "500",
    },
    sectionHeader: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    sectionHeaderLeft: {
        flex: 1,
        gap: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
    },
    sectionSubtitle: {
        fontSize: 12,
        fontWeight: "500",
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#ffffff22",
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "600",
    },
    scraperList: {
        gap: 10,
        marginTop: 4,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: {
        alignItems: "center",
        marginTop: 32,
    },
});

export default ScraperStatusScreen;