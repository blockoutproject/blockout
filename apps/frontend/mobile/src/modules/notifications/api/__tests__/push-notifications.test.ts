import { registerForPushNotificationsAsync } from "@/src/modules/notifications/api/push-notifications";

const mockSetNotificationChannel = jest.fn();
const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockGetExpoPushToken = jest.fn();
let mockIsDevice = false;

jest.mock("expo-device", () => ({
  get isDevice() {
    return mockIsDevice;
  },
}));

jest.mock("expo-constants", () => ({
  expoConfig: { extra: { eas: { projectId: "project-id" } } },
  easConfig: null,
}));

jest.mock("expo-notifications", () => ({
  AndroidImportance: { MAX: "max" },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: (...args: unknown[]) =>
    mockSetNotificationChannel(...args),
  getPermissionsAsync: () => mockGetPermissions(),
  requestPermissionsAsync: () => mockRequestPermissions(),
  getExpoPushTokenAsync: (...args: unknown[]) => mockGetExpoPushToken(...args),
}));

describe("push notification registration boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDevice = false;
  });

  it("skips simulators twice with one diagnostic and no blocking alert", async () => {
    const warning = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const alert = jest.fn();
    global.alert = alert;

    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();

    expect(warning).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
    expect(mockSetNotificationChannel).not.toHaveBeenCalled();
    expect(mockGetPermissions).not.toHaveBeenCalled();

    warning.mockRestore();
    delete (global as { alert?: typeof global.alert }).alert;
  });

  it("preserves the real-device permission and token path", async () => {
    mockIsDevice = true;
    mockGetPermissions.mockResolvedValue({ status: "granted" });
    mockGetExpoPushToken.mockResolvedValue({ data: "ExponentPushToken[7]" });

    await expect(registerForPushNotificationsAsync()).resolves.toBe(
      "ExponentPushToken[7]",
    );

    expect(mockGetPermissions).toHaveBeenCalledTimes(1);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockGetExpoPushToken).toHaveBeenCalledWith({
      projectId: "project-id",
    });
  });
});
