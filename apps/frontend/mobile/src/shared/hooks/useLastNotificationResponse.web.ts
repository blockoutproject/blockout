/** Browser verification has no native push-notification response. */
export const useLastNotificationResponse = () => undefined;

/** No browser value can represent a native notification action. */
export const isDefaultNotificationAction = (_response: never): boolean => false;
