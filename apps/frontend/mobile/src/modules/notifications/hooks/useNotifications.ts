import { useInfiniteQuery } from "@tanstack/react-query";

import {
  NotificationResponse,
  NotificationPageResponse,
} from "@/src/shared/generated/models";
import { useApis } from "@/src/shared/providers/ApiProvider";

export const notificationListQueryKey = (pageSize: number) =>
  ["notifications", "enriched", `size:${pageSize}`] as const;

export const useNotifications = (pageSize = 20) => {
  const { mobile } = useApis();

  const query = useInfiniteQuery<NotificationPageResponse>({
    queryKey: notificationListQueryKey(pageSize),
    queryFn: ({ pageParam = 0 }) =>
      mobile.notifications.getNotifications({
        page: pageParam as number,
        size: pageSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const pages = query.data?.pages ?? [];
  const items: NotificationResponse[] = pages.flatMap(
    (page) => page.notifications,
  );

  return {
    ...query,
    items,
  };
};
