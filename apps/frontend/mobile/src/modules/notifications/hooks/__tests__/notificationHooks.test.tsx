import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  InfiniteData,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import React from "react";

import { useDeleteNotification } from "@/src/modules/notifications/hooks/useDeleteNotification";
import {
  notificationListQueryKey,
  useNotifications,
} from "@/src/modules/notifications/hooks/useNotifications";
import {
  EnrichedUserNotification,
  EnrichedUserNotificationPage,
  NotificationTargetType,
  NotificationType,
} from "@/src/modules/notifications/model/Notification";

const mockGetNotifications = jest.fn();
const mockDeleteNotification = jest.fn();

jest.mock("@/src/shared/providers/ApiProvider", () => ({
  useApis: () => ({
    mobile: {
      notifications: {
        getNotifications: mockGetNotifications,
        deleteNotification: mockDeleteNotification,
      },
    },
  }),
}));

const notification: EnrichedUserNotification = {
  id: 12,
  userId: 4,
  type: NotificationType.MATCH_FINISHED,
  title: "Match terminé",
  body: "Le score final est disponible.",
  deepLink: "/match/42",
  targetType: NotificationTargetType.MATCH,
  targetId: 42,
  metadata: null,
  isRead: false,
  isOpened: false,
  createdAt: "2026-07-21T10:00:00.000Z",
  readAt: null,
  openedAt: null,
  divisionLogoUrl: null,
};

const page: EnrichedUserNotificationPage = {
  notifications: [notification],
  hasNext: false,
  nextPage: null,
};

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });

describe("notification hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads and exposes the notifications returned by the gateway", async () => {
    const queryClient = createQueryClient();
    mockGetNotifications.mockResolvedValue(page);

    const { result, unmount } = await renderHook(() => useNotifications(20), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.items).toEqual([notification]));
    expect(mockGetNotifications).toHaveBeenCalledWith({ page: 0, size: 20 });

    await act(async () => unmount());
    queryClient.clear();
  });

  it("restores the cached page when deletion fails", async () => {
    const queryClient = createQueryClient();
    const queryKey = notificationListQueryKey(20);
    const cached: InfiniteData<EnrichedUserNotificationPage> = {
      pages: [page],
      pageParams: [0],
    };
    queryClient.setQueryData(queryKey, cached);
    mockDeleteNotification.mockRejectedValue(new Error("network"));

    const { result, unmount } = await renderHook(
      () => useDeleteNotification(20),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await expect(result.current.mutateAsync(notification.id)).rejects.toThrow(
        "network",
      );
    });

    expect(queryClient.getQueryData(queryKey)).toEqual(cached);

    await act(async () => unmount());
    queryClient.clear();
  });
});
