import { fireEvent, render, userEvent } from "@testing-library/react-native";
import React from "react";

import {
  NotificationResponse,
  NotificationTargetTypeEnum,
  NotificationTypeEnum,
} from "@/src/shared/generated/models";
import { formatNotificationAge } from "@/src/modules/notifications/model/formatNotificationAge";
import NotificationItem from "@/src/modules/notifications/ui/NotificationItem";
import {ThemeProvider} from "@/src/shared/theme";

jest.mock("expo-image", () => ({ Image: "Image" }));
jest.mock("@/src/shared/ui/animations/FadeIn", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/src/modules/notifications/ui/NotificationSwipeAction", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

const notification: NotificationResponse = {
  id: 12,
  userId: 4,
  type: NotificationTypeEnum.MATCH_FINISHED,
  title: "Match terminé",
  body: "Le score final est disponible.",
  deepLink: "/match/42",
  targetType: NotificationTargetTypeEnum.MATCH,
  targetId: 42,
  metadata: null,
  isRead: false,
  isOpened: false,
  createdAt: "2026-07-21T10:00:00.000Z",
  readAt: null,
  openedAt: null,
  divisionLogoUrl: "https://example.test/division.png",
};

describe("NotificationItem", () => {
  beforeEach(() => {
    jest
      .spyOn(Date, "now")
      .mockReturnValue(new Date("2026-07-21T12:00:00.000Z").getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps the established relative-time labels", () => {
    expect(formatNotificationAge("2026-07-21T11:59:30.000Z")).toBe(
      "à l’instant",
    );
    expect(formatNotificationAge("2026-07-21T11:45:00.000Z")).toBe(
      "il y a 15 min",
    );
    expect(formatNotificationAge(notification.createdAt)).toBe("il y a 2 h");
    expect(formatNotificationAge("2026-07-19T12:00:00.000Z")).toBe(
      "il y a 2 j",
    );
  });

  it("exposes one accessible action and opens the selected notification", async () => {
    const onOpen = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <NotificationItem
          notification={notification}
          onOpen={onOpen}
          onDelete={jest.fn()}
        />
      </ThemeProvider>,
    );

    const item = screen.getByRole("button", {
      name: "Match terminé. Le score final est disponible.",
    });

    expect(screen.getByTestId("notifications-item-12")).toBe(item);

    await user.press(item);

    expect(onOpen).toHaveBeenCalledWith(notification);
  });

  it("supports deletion through an accessibility action", async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <ThemeProvider>
        <NotificationItem
          notification={notification}
          onOpen={jest.fn()}
          onDelete={onDelete}
        />
      </ThemeProvider>,
    );

    await fireEvent(
      screen.getByTestId("notifications-item-12"),
      "accessibilityAction",
      { nativeEvent: { actionName: "delete" } },
    );

    expect(onDelete).toHaveBeenCalledWith(notification);
  });
});
