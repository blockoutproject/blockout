import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import MobileGatewayApi from "@/src/api/MobileGatewayApi";
import { EnrichedUserNotification, EnrichedUserNotificationPage } from "@/src/types/Notification";

/**
 * Liste infinie des notifications utilisateur (enrichies via Mobile Gateway).
 * - Contrat aligné sur { notifications, hasNext, nextPage }
 * - getNextPageParam via nextPage (comme useMatchList)
 */
export const useNotifications = (pageSize = 20) => {
    const queryKey = useMemo(
        () => ["notifications", "enriched", `size:${pageSize}`],
        [pageSize]
    );

    const query = useInfiniteQuery<EnrichedUserNotificationPage>({
        queryKey,
        queryFn: ({ pageParam = 0 }) =>
            MobileGatewayApi.getInstance().getEnrichedNotifications({
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