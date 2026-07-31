import { useCallback, useEffect } from "react";
import type { NotificationResponse } from "expo-notifications";

import {
  addNotificationListeners,
  openNotificationUrlIfAny,
} from "@/src/modules/notifications/api/push-notifications";

export const NotificationResponseController = () => {
  const handleNotificationRespond = useCallback(
    (response: NotificationResponse) => {
      const data = response.notification.request.content.data;
      openNotificationUrlIfAny(data);
    },
    [],
  );

  useEffect(() => {
    return addNotificationListeners({
      onRespond: handleNotificationRespond,
    });
  }, [handleNotificationRespond]);

  return null;
};
