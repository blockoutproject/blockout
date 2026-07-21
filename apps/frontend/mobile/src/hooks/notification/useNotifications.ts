import {useMemo} from "react";
import {useInfiniteQuery} from "@tanstack/react-query";
import {EnrichedUserNotification, EnrichedUserNotificationPage} from "@/src/types/Notification";
import {useApis} from "@/src/shared/providers/ApiProvider";

/**
 * Liste infinie des notifications utilisateur (enrichies via Mobile Gateway).
 */
export const useNotifications = (pageSize = 3) => {
  const {mobile} = useApis();

  const queryKey = useMemo(
    () => ["notifications", "enriched", `size:${pageSize}`],
    [pageSize]
  );

  const query = useInfiniteQuery<EnrichedUserNotificationPage>({
    queryKey,
    queryFn: ({pageParam = 0}) =>
      mobile.notifications.getNotifications({
        page: pageParam as number,
        size: pageSize,
      }),
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
