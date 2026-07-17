import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  EnrichedUserNotification,
  EnrichedUserNotificationPage,
} from '@/src/types/Notification';
import { listMobileNotifications } from '@/src/api/generated/mobile-gateway/endpoints/mobile-notifications/mobile-notifications';
import {
  ListMobileNotificationsQueryParams,
  ListMobileNotificationsResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-notifications/mobile-notifications.zod';
import { toNotificationPageView } from './notificationView';

/**
 * Liste infinie des notifications utilisateur (enrichies via Mobile Gateway).
 */
export const useNotifications = (pageSize = 3) => {
  const queryKey = useMemo(
    () => ['notifications', 'enriched', `size:${pageSize}`],
    [pageSize],
  );

  const query = useInfiniteQuery<EnrichedUserNotificationPage>({
    queryKey,
    queryFn: async ({ pageParam = 0, signal }) => {
      const params = ListMobileNotificationsQueryParams.parse({
        page: pageParam,
        pageSize,
      });
      return toNotificationPageView(
        ListMobileNotificationsResponse.parse(
          await listMobileNotifications(params, undefined, signal),
        ),
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage?.nextPage ?? undefined,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const pages = query.data?.pages ?? [];
  const items: EnrichedUserNotification[] =
    pages.flatMap((p) => p.notifications) ?? [];

  const hasLoadedOnce = pages.length > 0;
  const isBackgroundRefetching =
    query.isFetching && !query.isLoading && !query.isFetchingNextPage;

  return {
    ...query,
    items,
    hasLoadedOnce,
    isBackgroundRefetching,
  };
};
