import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { DevicePlatform } from "@/src/modules/notifications/model/Notification";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Open the supported deep link carried by a notification payload. */
export function openNotificationUrlIfAny(
  data?: Record<string, unknown>,
  handleNavigationWithAd?: (navigate: () => void) => void,
) {
  const url = typeof data?.url === "string" ? data.url : null;
  if (!url) return;

  const navigate = () => {
    Linking.openURL(url).catch(() => {
      console.warn("[notifications] openURL failed");
    });
  };

  if (handleNavigationWithAd) {
    handleNavigationWithAd(navigate);
  } else {
    navigate();
  }
}

/** Map the active React Native platform to the internal notification contract. */
export function platformToNotificationDevice(): DevicePlatform {
  if (Platform.OS === "ios") return "IOS";
  if (Platform.OS === "android") return "ANDROID";
  if (Platform.OS === "web") return "WEB";
  return "UNKNOWN";
}

/** Request native notification permission and return the Expo push token. */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  if (!Device.isDevice) {
    alert("Must use physical device for push notifications");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    alert("Project ID not found");
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data ?? null;
}

/** Subscribe to foreground notifications and user responses. */
export function addNotificationListeners({
  onReceive,
  onRespond,
}: {
  onReceive?: (notification: Notifications.Notification) => void;
  onRespond?: (response: Notifications.NotificationResponse) => void;
}) {
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      onReceive?.(notification);
    },
  );
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      onRespond?.(response);
    });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
