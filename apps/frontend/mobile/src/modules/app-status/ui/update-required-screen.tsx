import React, { useCallback, useMemo } from "react";
import { Linking, Text, View } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { CURRENT_APP_VERSION } from "@/src/modules/app-status/model/appVersion";
import {
  AppStatusBypassAction,
  AppStatusCard,
  appStatusContentStyles,
} from "@/src/modules/app-status/ui/app-status-card";
import { AppStatusLayout } from "@/src/modules/app-status/ui/app-status-layout";
import {
  useSessionActions,
  useSessionState,
} from "@/src/modules/session/providers/SessionContext";
import { useAppTheme } from "@/src/shared/theme";
import { Action } from "@/src/shared/ui/action";

/** Renders the platform update gate without changing store or bypass policy. */
const UpdateRequiredScreen: React.FC = () => {
  const {
    appStatus,
    isAppStatusLoading,
    appUpdateUrl,
    canBypassUpdate,
  } = useSessionState();
  const { bypassUpdate } = useSessionActions();
  const theme = useAppTheme();

  const message = useMemo(
    () =>
      appStatus?.forceUpdateMessage ??
      "Une nouvelle version de Blockout est disponible et est obligatoire pour continuer à utiliser l’application.",
    [appStatus?.forceUpdateMessage],
  );

  const handleOpenStore = useCallback(async () => {
    if (!appUpdateUrl) {
      return;
    }

    const canOpen = await Linking.canOpenURL(appUpdateUrl).catch(() => false);
    if (canOpen) {
      await Linking.openURL(appUpdateUrl).catch(() => undefined);
    }
  }, [appUpdateUrl]);

  const handleBypass = useCallback(() => {
    if (canBypassUpdate) {
      bypassUpdate();
    }
  }, [bypassUpdate, canBypassUpdate]);

  return (
    <AppStatusLayout
      title="Mise à jour"
      footer="Merci de garder Blockout à jour !"
      testID="update-required-screen"
    >
      <AppStatusCard
        statusLabel="Mise à jour requise"
        statusIcon="alert-decagram-outline"
        statusColor={theme.primary}
        title="Mets Blockout à jour pour continuer"
      >
        <Image
          source={require("@/assets/images/update-required.png")}
          style={appStatusContentStyles.illustration}
          contentFit="contain"
        />

        <View style={appStatusContentStyles.messageGroup}>
          <Text
            style={[
              appStatusContentStyles.message,
              { color: theme.textSecondary },
            ]}
          >
            {message}
          </Text>
          <Text
            style={[
              appStatusContentStyles.version,
              { color: theme.textInactive },
            ]}
          >
            Version installée : {CURRENT_APP_VERSION}
          </Text>
        </View>

        <View style={appStatusContentStyles.actions}>
          <Action
            onPress={handleOpenStore}
            label="Mettre à jour l’application"
            loadingLabel="Vérification…"
            loading={isAppStatusLoading}
            disabled={!appUpdateUrl}
            fullWidth
            leftIcon={
              <MaterialCommunityIcons
                name="open-in-new"
                size={18}
                color={theme.onPrimary}
              />
            }
            testID="update-required-store-action"
          />

          {canBypassUpdate ? (
            <AppStatusBypassAction
              onPress={handleBypass}
              testID="update-required-bypass-action"
            />
          ) : null}
        </View>
      </AppStatusCard>
    </AppStatusLayout>
  );
};

export default UpdateRequiredScreen;
