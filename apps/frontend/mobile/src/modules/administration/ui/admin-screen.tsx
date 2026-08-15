import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import {
  fontWeight,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import { useAppStatus } from "@/src/modules/app-status/hooks/use-app-status";
import { useMaintenanceControl } from "@/src/modules/administration/hooks/use-maintenance-control";
import { useAppVersionControl } from "@/src/modules/administration/hooks/use-app-version-control";
import { useScraperControls } from "@/src/modules/administration/hooks/use-scraper-controls";

import MaintenanceControlCard from "./maintenance-control-card";
import ScraperControlCard from "./scraper-control-card";
import AppVersionControlCard from "./app-version-control-card";
import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";

const AdminScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [apiError, setApiError] = useState<string | null>(null);
  const showApiError = useCallback((message: string) => {
    setApiError(message);
  }, []);
  const clearApiError = useCallback(() => {
    setApiError(null);
  }, []);

  const {
    data: appStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useAppStatus();

  const maintenance = useMaintenanceControl({
    appStatus,
    refetchStatus,
    onStart: clearApiError,
    onError: showApiError,
  });
  const versions = useAppVersionControl({
    appStatus,
    refetchStatus,
    onStart: clearApiError,
    onError: showApiError,
  });
  const scrapers = useScraperControls(clearApiError, showApiError);

  const globalLoading = scrapers.isLoading || statusLoading;

  if (globalLoading && !appStatus && !scrapers.hasData) {
    return (
      <>
        <View
          style={[
            styles.center,
            { backgroundColor: theme.backgroundSecondary },
          ]}
          testID="administration-loading"
        >
          <ActivityIndicator size="large" color={theme.text} />
        </View>
        <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
      </>
    );
  }

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        testID="administration-screen"
      >
        <View style={styles.headerWrapper}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            Administration technique
          </Text>

          <Text style={[styles.screenSubtitle, { color: theme.textInactive }]}>
            Gérez le mode maintenance, les versions minimales et l’état des
            scrapers.
          </Text>
        </View>

        <MaintenanceControlCard
          maintenanceEnabled={maintenance.enabled}
          maintenanceMessage={maintenance.message}
          maintenanceImageUrl={maintenance.imageUrl}
          lastUpdate={appStatus?.lastUpdate || undefined}
          loading={globalLoading}
          isDirty={maintenance.isDirty}
          saving={maintenance.saving}
          onChangeMessage={maintenance.setMessage}
          onChangeImageUrl={maintenance.setImageUrl}
          onSave={maintenance.save}
          onDisable={maintenance.disable}
        />

        <AppVersionControlCard
          minVersionIos={versions.minVersionIos}
          minVersionAndroid={versions.minVersionAndroid}
          forceUpdateMessage={versions.forceUpdateMessage}
          storeUrlIos={versions.storeUrlIos}
          storeUrlAndroid={versions.storeUrlAndroid}
          lastUpdate={appStatus?.lastUpdate || undefined}
          loading={statusLoading}
          saving={versions.saving}
          isDirty={versions.isDirty}
          onChangeMinVersionIos={versions.setMinVersionIos}
          onChangeMinVersionAndroid={versions.setMinVersionAndroid}
          onChangeForceUpdateMessage={versions.setForceUpdateMessage}
          onChangeStoreUrlIos={versions.setStoreUrlIos}
          onChangeStoreUrlAndroid={versions.setStoreUrlAndroid}
          onSave={versions.save}
        />

        <ScraperControlCard
          scrapers={scrapers.scrapers}
          loading={scrapers.isLoading}
          refreshing={scrapers.isLoading ? scrapers.hasData : false}
          onToggleScraper={scrapers.toggle}
          onRefresh={scrapers.refetch}
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
    paddingTop: spacing[2],
    paddingHorizontal: spacing[3],
    gap: spacing[4],
  },
  headerWrapper: {
    gap: spacing[2],
  },
  screenTitle: {
    fontSize: typography.heading.fontSize,
    fontWeight: fontWeight.extraBold,
  },
  screenSubtitle: {
    fontSize: typography.label.fontSize,
    fontWeight: fontWeight.medium,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
