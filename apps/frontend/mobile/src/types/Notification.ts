export type DevicePlatform = 'IOS' | 'ANDROID' | 'WEB' | 'UNKNOWN';

export type EnrichedUserNotification = {
  id: number;
  title: string;
  body: string;
  deepLink: string | null;
  createdAt: string;
  divisionLogoUrl: string | null;
};

export type EnrichedUserNotificationPage = {
  notifications: EnrichedUserNotification[];
  hasNext: boolean;
  nextPage: number | null;
};
