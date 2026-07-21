import * as Notifications from "expo-notifications";

/** Returns the most recent native notification interaction. */
export const useLastNotificationResponse =
  Notifications.useLastNotificationResponse;

/** Identifies a notification opened through its standard action. */
export const isDefaultNotificationAction = (
  response: Notifications.NotificationResponse,
): boolean =>
  response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER;
