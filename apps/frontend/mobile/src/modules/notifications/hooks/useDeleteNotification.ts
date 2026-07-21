import {
  InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { notificationListQueryKey } from "@/src/modules/notifications/hooks/useNotifications";
import { EnrichedUserNotificationPage } from "@/src/modules/notifications/model/Notification";
import { useApis } from "@/src/shared/providers/ApiProvider";

export function useDeleteNotification(pageSize = 20) {
  const queryClient = useQueryClient();
  const { mobile } = useApis();
  const queryKey = notificationListQueryKey(pageSize);

  return useMutation({
    mutationFn: (id: number) => mobile.notifications.deleteNotification(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<InfiniteData<EnrichedUserNotificationPage>>(
          queryKey,
        );

      queryClient.setQueryData<InfiniteData<EnrichedUserNotificationPage>>(
        queryKey,
        (current) => {
          if (!current) return current;

          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              notifications: page.notifications.filter(
                (notification) => notification.id !== id,
              ),
            })),
          };
        },
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
