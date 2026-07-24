import React, { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  useSessionActions,
  useSessionState,
} from "@/src/modules/session/providers/SessionContext";
import {
  AppStatusBypassAction,
  AppStatusCard,
  appStatusContentStyles,
} from "@/src/modules/app-status/ui/app-status-card";
import { AppStatusLayout } from "@/src/modules/app-status/ui/app-status-layout";
import { Action } from "@/src/shared/ui/action";
import MaskedImage from "@/src/shared/ui/images/MaskedImage";
import { useAppTheme } from "@/src/shared/theme";

/** Renders the configuration-owned maintenance gate and its authorized actions. */
const MaintenanceScreen: React.FC = () => {
  const { appStatus, isAppStatusLoading, canBypassMaintenance } =
    useSessionState();
  const { refetchAppStatus, bypassMaintenance } = useSessionActions();
  const theme = useAppTheme();
  const { message, imageUrl } = appStatus ?? {
    message: null,
    imageUrl: null,
  };

  const displayMessage = useMemo(
    () =>
      message ??
      "On prépare une nouvelle version de l’application. Quelques minutes et tout sera de retour.",
    [message],
  );

  const handleRetry = useCallback(() => {
    refetchAppStatus();
  }, [refetchAppStatus]);

  const handleBypass = useCallback(() => {
    if (canBypassMaintenance) {
      bypassMaintenance();
    }
  }, [bypassMaintenance, canBypassMaintenance]);

  return (
    <AppStatusLayout
      title="Maintenance"
      footer="Merci pour ta patience !"
      testID="maintenance-screen"
    >
      <AppStatusCard
        statusLabel="Maintenance en cours"
        statusIcon="tools"
        statusColor={theme.warning}
        title="On peaufine Blockout"
      >
        <MaskedImage uri={imageUrl ?? undefined} size={250} radius={26} />

        <Text
          style={[
            appStatusContentStyles.message,
            { color: theme.textSecondary },
          ]}
        >
          {displayMessage}
        </Text>

        <View style={appStatusContentStyles.actions}>
          <Action
            onPress={handleRetry}
            label="Réessayer"
            loadingLabel="Vérification…"
            loading={isAppStatusLoading}
            fullWidth
            leftIcon={
              <MaterialCommunityIcons
                name="reload"
                size={18}
                color={theme.onPrimary}
              />
            }
            testID="maintenance-retry-action"
          />

          {canBypassMaintenance ? (
            <AppStatusBypassAction
              onPress={handleBypass}
              testID="maintenance-bypass-action"
            />
          ) : null}
        </View>
      </AppStatusCard>
    </AppStatusLayout>
  );
};

export default MaintenanceScreen;
