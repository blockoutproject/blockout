import type { MobileNotificationPageResponse } from '@/src/api/generated/mobile-gateway/models';
import type { EnrichedUserNotificationPage } from '@/src/types/Notification';

/** Preserves the existing Expo page shape and owner item order. */
export function toNotificationPageView(
  response: MobileNotificationPageResponse,
): EnrichedUserNotificationPage {
  return {
    notifications: response.items.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      deepLink: item.deepLink,
      createdAt: item.createdAt,
      divisionLogoUrl: item.divisionLogoUrl,
    })),
    hasNext: response.pageInfo.hasNext,
    nextPage: response.pageInfo.hasNext ? response.pageInfo.page + 1 : null,
  };
}
