import { act, render, waitFor } from "@testing-library/react-native";

import { NotificationResponseController } from "@/src/modules/notifications/providers/notification-response-controller";
import { PushRegistrationController } from "@/src/modules/notifications/providers/push-registration-controller";

const mockAddNotificationListeners = jest.fn();
const mockOpenNotificationUrlIfAny = jest.fn();
const mockRegisterForPushNotifications = jest.fn();
const mockRegisterPushToken = jest.fn();
const mockRemoveListeners = jest.fn();

let mockSession = {
  customUser: { id: 7 },
  isAuthenticated: false,
};
let mockHasCompletedOnboarding = false;

jest.mock("@/src/modules/notifications/api/push-notifications", () => ({
  addNotificationListeners: (...args: unknown[]) =>
    mockAddNotificationListeners(...args),
  openNotificationUrlIfAny: (...args: unknown[]) =>
    mockOpenNotificationUrlIfAny(...args),
  registerForPushNotificationsAsync: () => mockRegisterForPushNotifications(),
}));

jest.mock("@/src/modules/notifications/hooks/use-register-push-token", () => ({
  useRegisterPushToken: () => mockRegisterPushToken,
}));

jest.mock("@/src/modules/session/providers/session-context", () => ({
  useSessionState: () => mockSession,
}));

jest.mock("@/src/modules/onboarding/model/onboarding-store", () => ({
  useOnboardingStore: (
    selector: (state: { hasCompletedOnboarding: boolean }) => boolean,
  ) => selector({ hasCompletedOnboarding: mockHasCompletedOnboarding }),
}));

describe("notification lifecycle controllers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = {
      customUser: { id: 7 },
      isAuthenticated: false,
    };
    mockHasCompletedOnboarding = false;
    mockAddNotificationListeners.mockReturnValue(mockRemoveListeners);
    mockRegisterForPushNotifications.mockResolvedValue("ExponentPushToken[7]");
    mockRegisterPushToken.mockResolvedValue(undefined);
  });

  it("owns notification response listeners and cleans them up", async () => {
    const screen = await render(<NotificationResponseController />);
    const { onRespond } = mockAddNotificationListeners.mock.calls[0][0];
    const data = { url: "/match/42" };

    onRespond({
      notification: { request: { content: { data } } },
    });
    expect(mockOpenNotificationUrlIfAny).toHaveBeenCalledWith(data);

    await act(async () => {
      screen.unmount();
    });
    expect(mockRemoveListeners).toHaveBeenCalledTimes(1);
  });

  it("registers push only after authentication and onboarding", async () => {
    const screen = await render(<PushRegistrationController />);
    expect(mockRegisterForPushNotifications).not.toHaveBeenCalled();

    mockSession = {
      customUser: { id: 7 },
      isAuthenticated: true,
    };
    mockHasCompletedOnboarding = true;
    await screen.rerender(<PushRegistrationController />);

    await waitFor(() => {
      expect(mockRegisterForPushNotifications).toHaveBeenCalledTimes(1);
      expect(mockRegisterPushToken).toHaveBeenCalledWith(
        7,
        "ExponentPushToken[7]",
      );
    });
  });

  it("keeps permission and token failures non-fatal", async () => {
    mockSession = {
      customUser: { id: 7 },
      isAuthenticated: true,
    };
    mockHasCompletedOnboarding = true;
    mockRegisterForPushNotifications.mockRejectedValue(
      new Error("permission denied"),
    );

    await render(<PushRegistrationController />);

    await waitFor(() =>
      expect(mockRegisterForPushNotifications).toHaveBeenCalledTimes(1),
    );
    expect(mockRegisterPushToken).not.toHaveBeenCalled();
  });
});
