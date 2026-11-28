import type * as Notifications from "expo-notifications";

/** Builds an SDK tap with explicit identity, original timing and routing data, independently of API notification content. */
export function nativeNotificationResponse(
  identifier: string,
  date: number,
  data: Notifications.NotificationContent["data"],
): Notifications.NotificationResponse {
  return {
    actionIdentifier: "default",
    notification: {
      date,
      request: {
        identifier,
        trigger: { type: "push" },
        content: {
          title: null,
          subtitle: null,
          body: null,
          categoryIdentifier: null,
          sound: null,
          launchImageName: null,
          badge: null,
          attachments: [],
          threadIdentifier: null,
          data,
        },
      },
    },
  };
}
