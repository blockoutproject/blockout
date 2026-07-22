import * as Device from "expo-device";
import { useCallback } from "react";

import { RegisterPushTokenRequest } from "@/src/shared/generated/models";
import { platformToNotificationDevice } from "@/src/modules/notifications/push";
import { useApis } from "@/src/shared/providers/ApiProvider";

export function useRegisterPushToken() {
  const { mobile } = useApis();

  return useCallback(
    async (userId: number, expoPushToken: string | null) => {
      if (!expoPushToken) return;

      const deviceId = Device.isDevice
        ? (Device.osInternalBuildId ?? Device.osBuildId ?? null)
        : null;

      const payload: RegisterPushTokenRequest = {
        expoPushToken,
        platform: platformToNotificationDevice(),
        deviceId,
      };

      await mobile.notifications.registerPushToken(userId, payload);
    },
    [mobile],
  );
}
