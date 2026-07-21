import React, {useCallback, useEffect, useMemo, useState} from "react";
import {ActivityIndicator, StyleSheet, Text, View,} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {BottomSheetScrollView} from "@gorhom/bottom-sheet";

import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {useScraperStatuses} from "@/src/hooks/config/scraper/useScraperStatus";
import {useAppStatus} from "@/src/hooks/config/app/useAppStatus";
import {useApis} from "@/src/shared/providers/ApiProvider";
import {ScraperStatus} from "@/src/types/ScraperStatus";

import MaintenanceControlCard from "./MaintenanceControlCard";
import ScraperControlCard from "./ScraperControlCard";
import AppVersionControlCard from "./AppVersionControlCard";
import ApiErrorToast from "@/src/shared/ui/feedback/ApiErrorToast";

const AdminScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const {mobile} = useApis();

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

  const [minVersionIos, setMinVersionIos] = useState<string>("");
  const [minVersionAndroid, setMinVersionAndroid] = useState<string>("");
  const [forceUpdateMessage, setForceUpdateMessage] = useState<string>("");
  const [storeUrlIos, setStoreUrlIos] = useState<string>("");
  const [storeUrlAndroid, setStoreUrlAndroid] = useState<string>("");
  const [savingVersions, setSavingVersions] = useState(false);

  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!appStatus) return;

    setMaintenanceEnabled(appStatus.maintenance);
    setMaintenanceMessage(appStatus.message ?? "");
    setMaintenanceImageUrl(appStatus.imageUrl ?? "");

    setMinVersionIos(appStatus.minVersionIos ?? "");
    setMinVersionAndroid(appStatus.minVersionAndroid ?? "");
    setForceUpdateMessage(appStatus.forceUpdateMessage ?? "");
    setStoreUrlIos(appStatus.storeUrlIos ?? "");
    setStoreUrlAndroid(appStatus.storeUrlAndroid ?? "");
  }, [appStatus]);

  const sortedScrapers: ScraperStatus[] = useMemo(() => {
    if (!scrapers) return [];
    return [...scrapers].sort((a, b) => a.name.localeCompare(b.name));
  }, [scrapers]);

  const toggleScraper = useCallback(
    async (scraper: ScraperStatus) => {
      try {
        setApiError(null);
        await Haptics.selectionAsync();
        await mobile.config.updateScraperStatus(
          scraper.name,
          !scraper.enabled,
        );
        await refetchScrapers();
      } catch (error) {
        console.error("Erreur lors du toggle scraper :", error);
        setApiError("Mise à jour du scraper impossible, réessaie.");
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        ).catch(() => {
        });
      }
    },
    [mobile, refetchScrapers],
  );

  const initialMessage = appStatus?.message ?? "";
  const initialImageUrl = appStatus?.imageUrl ?? "";

  const isMaintenanceDirty =
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

      await mobile.config.updateAppStatus({
        maintenance: true,
        message: trimmedMessage,
        imageUrl: trimmedImageUrl.length ? trimmedImageUrl : null,
      });

      await refetchStatus();

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour du statut de l’app :",
        error,
      );
      setApiError(
        "Mise à jour de la maintenance impossible, réessaie.",
      );
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {
      });
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

      await mobile.config.updateAppStatus({
        maintenance: false,
        message: undefined,
        imageUrl: undefined,
      });

      await refetchStatus();

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {
      });
    } catch (error) {
      console.error(
        "Erreur lors de la désactivation de la maintenance :",
        error,
      );
      setApiError(
        "Désactivation de la maintenance impossible, réessaie.",
      );
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {
      });
    } finally {
      setSavingMaintenance(false);
    }
  }, [mobile, refetchStatus, savingMaintenance]);

  const initialMinVersionIos = appStatus?.minVersionIos ?? "";
  const initialMinVersionAndroid = appStatus?.minVersionAndroid ?? "";
  const initialForceUpdateMessage = appStatus?.forceUpdateMessage ?? "";
  const initialStoreUrlIos = appStatus?.storeUrlIos ?? "";
  const initialStoreUrlAndroid = appStatus?.storeUrlAndroid ?? "";

  const isVersionDirty =
    minVersionIos !== initialMinVersionIos ||
    minVersionAndroid !== initialMinVersionAndroid ||
    forceUpdateMessage !== initialForceUpdateMessage ||
    storeUrlIos !== initialStoreUrlIos ||
    storeUrlAndroid !== initialStoreUrlAndroid;

  const handleSaveVersions = useCallback(async () => {
    if (savingVersions) return;

    const trimmedIos = minVersionIos.trim();
    const trimmedAndroid = minVersionAndroid.trim();
    const trimmedMsg = forceUpdateMessage.trim();
    const trimmedStoreIos = storeUrlIos.trim();
    const trimmedStoreAndroid = storeUrlAndroid.trim();

    try {
      setApiError(null);
      setSavingVersions(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await mobile.config.updateAppStatus({
        minVersionIos: trimmedIos.length ? trimmedIos : null,
        minVersionAndroid: trimmedAndroid.length ? trimmedAndroid : null,
        forceUpdateMessage: trimmedMsg.length ? trimmedMsg : null,
        storeUrlIos: trimmedStoreIos.length ? trimmedStoreIos : null,
        storeUrlAndroid: trimmedStoreAndroid.length
          ? trimmedStoreAndroid
          : null,
      });

      await refetchStatus();

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {
      });
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour des versions minimales :",
        error,
      );
      setApiError(
        "Mise à jour des versions minimales impossible, réessaie.",
      );
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {
      });
    } finally {
      setSavingVersions(false);
    }
  }, [
    savingVersions,
    minVersionIos,
    minVersionAndroid,
    forceUpdateMessage,
    storeUrlIos,
    storeUrlAndroid,
    mobile,
    refetchStatus,
  ]);

  const globalLoading = scrapersLoading || statusLoading;

  if (globalLoading && !appStatus && !scrapers) {
    return (
      <>
        <View
          style={[
            styles.center,
            {backgroundColor: theme.backgroundSecondary},
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
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {paddingBottom: insets.bottom + 16},
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrapper}>
          <Text
            style={[styles.screenTitle, {color: theme.text}]}
          >
            Administration technique
          </Text>

          <Text
            style={[
              styles.screenSubtitle,
              {color: theme.textInactive},
            ]}
          >
            Gérez le mode maintenance, les versions minimales et
            l’état des scrapers.
          </Text>
        </View>

        <MaintenanceControlCard
          maintenanceEnabled={maintenanceEnabled}
          maintenanceMessage={maintenanceMessage}
          maintenanceImageUrl={maintenanceImageUrl}
          lastUpdate={appStatus?.lastUpdate || undefined}
          loading={globalLoading}
          isDirty={isMaintenanceDirty}
          saving={savingMaintenance}
          onChangeMessage={setMaintenanceMessage}
          onChangeImageUrl={setMaintenanceImageUrl}
          onSave={handleSaveMaintenance}
          onDisable={handleDisableMaintenance}
        />

        <AppVersionControlCard
          minVersionIos={minVersionIos}
          minVersionAndroid={minVersionAndroid}
          forceUpdateMessage={forceUpdateMessage}
          storeUrlIos={storeUrlIos}
          storeUrlAndroid={storeUrlAndroid}
          lastUpdate={appStatus?.lastUpdate || undefined}
          loading={statusLoading}
          saving={savingVersions}
          isDirty={isVersionDirty}
          onChangeMinVersionIos={setMinVersionIos}
          onChangeMinVersionAndroid={setMinVersionAndroid}
          onChangeForceUpdateMessage={setForceUpdateMessage}
          onChangeStoreUrlIos={setStoreUrlIos}
          onChangeStoreUrlAndroid={setStoreUrlAndroid}
          onSave={handleSaveVersions}
        />

        <ScraperControlCard
          scrapers={sortedScrapers}
          loading={scrapersLoading}
          refreshing={!!scrapersLoading && !!scrapers}
          onToggleScraper={toggleScraper}
          onRefresh={refetchScrapers}
        />
      </BottomSheetScrollView>

      <ApiErrorToast
        bottomOffset={insets.bottom}
        message={apiError}
        onHidden={() => setApiError(null)}
      />
    </>
  );
};

export default AdminScreen;

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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
