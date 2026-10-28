import AsyncStorage from "@react-native-async-storage/async-storage";
import { waitFor } from "@testing-library/react-native";
import { PermissionStatus } from "expo";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { createPushRegistration } from "../native/push-registration";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  setBadgeCountAsync: jest.fn().mockResolvedValue(true),
  AndroidImportance: { DEFAULT: 3 },
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const env = { ...process.env };
const accountId = "00000000-0000-4000-8000-000000000001";

/** Real generation and generated HTTP consumer; only native SDK/storage/network I/O is controlled. */
function registrationContext() {
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, accountId);
  return {
    session,
    owner: { ...session.getSnapshot(), isCurrent: session.isCurrent },
    request: jest.fn(async () => ({})),
    credentials: jest.fn(async () => ({ accessToken: "synthetic-token" })),
  };
}

beforeEach(async () => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  await AsyncStorage.clear();
  jest
    .mocked(Notifications.setBadgeCountAsync)
    .mockReset()
    .mockResolvedValue(true);
  jest.mocked(Notifications.getPermissionsAsync).mockReset().mockResolvedValue({
    granted: true,
    canAskAgain: true,
    expires: "never",
    status: PermissionStatus.GRANTED,
  });
  jest
    .mocked(Notifications.getExpoPushTokenAsync)
    .mockReset()
    .mockResolvedValue({ type: "expo", data: "ExponentPushToken[synthetic]" });
  mockFetch
    .mockReset()
    .mockImplementation(async (url: string, init: RequestInit) => {
      if (init.method === "DELETE") return new Response(null, { status: 204 });
      const body = JSON.parse(String(init.body));
      return Response.json({
        id: url.split("/").at(-1),
        installationId: body.installationId,
      });
    });
});

it("clears memory and attempts badge reset even when the exact HTTP removal fails", async () => {
  // Given
  const context = registrationContext();
  const push = createPushRegistration();
  await push.register(
    context.owner,
    "synthetic-project",
    context.request,
    context.credentials,
  );
  mockFetch.mockRejectedValueOnce(new Error("Removal unavailable"));
  jest
    .mocked(Notifications.setBadgeCountAsync)
    .mockRejectedValueOnce(new Error("Badge unavailable"));
  const remove = push.prepareRemoval();
  context.session.invalidate();

  // When
  await remove?.({
    ...context.session.getSnapshot(),
    isCurrent: context.session.isCurrent,
  });

  // Then
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "DELETE"),
  ).toHaveLength(1);
  expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
  expect(push.prepareRemoval()).toBeUndefined();
});
afterEach(() => {
  process.env = { ...env };
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it("keeps installation and connection through rotation, with a fresh connection after same-account sign-in", async () => {
  // Given
  const context = registrationContext();
  const push = createPushRegistration();

  // When
  await push.register(
    context.owner,
    "synthetic-project",
    context.request,
    context.credentials,
  );
  jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValueOnce({
    type: "expo",
    data: "ExponentPushToken[rotated]",
  });
  await push.register(
    context.owner,
    "synthetic-project",
    context.request,
    context.credentials,
  );
  const remove = push.prepareRemoval();
  context.session.invalidate();
  await remove?.({
    ...context.session.getSnapshot(),
    isCurrent: context.session.isCurrent,
  });
  context.session.setAccount(
    context.session.getSnapshot().generation,
    accountId,
  );
  await push.register(
    { ...context.session.getSnapshot(), isCurrent: context.session.isCurrent },
    "synthetic-project",
    context.request,
    context.credentials,
  );

  // Then
  const puts = mockFetch.mock.calls.filter(([, init]) => init.method === "PUT");
  expect(puts).toHaveLength(3);
  expect(puts[0][0]).toBe(puts[1][0]);
  expect(puts[2][0]).not.toBe(puts[0][0]);
  expect(puts.map(([, init]) => JSON.parse(init.body).installationId)).toEqual([
    expect.any(String),
    JSON.parse(puts[0][1].body).installationId,
    JSON.parse(puts[0][1].body).installationId,
  ]);
  expect(JSON.parse(puts[1][1].body).expoPushToken).toBe(
    "ExponentPushToken[rotated]",
  );
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
    projectId: "synthetic-project",
  });
});

it("discards token acquisition captured before A → guest → A", async () => {
  // Given
  const context = registrationContext();
  const push = createPushRegistration();
  const token = Promise.withResolvers<Notifications.ExpoPushToken>();
  jest
    .mocked(Notifications.getExpoPushTokenAsync)
    .mockReturnValueOnce(token.promise);
  const pending = push.register(
    context.owner,
    "synthetic-project",
    context.request,
    context.credentials,
  );
  await waitFor(() =>
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(1),
  );

  // When
  context.session.invalidate();
  context.session.setAccount(
    context.session.getSnapshot().generation,
    accountId,
  );
  token.resolve({ type: "expo", data: "ExponentPushToken[obsolete]" });
  await pending;

  // Then
  expect(mockFetch).not.toHaveBeenCalled();
});

it("does not register when permission is refused", async () => {
  // Given
  const context = registrationContext();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: false,
    canAskAgain: false,
    expires: "never",
    status: PermissionStatus.DENIED,
  });

  // When
  await createPushRegistration().register(
    context.owner,
    "synthetic-project",
    context.request,
    context.credentials,
  );

  // Then
  expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("preserves the ordinary admission cancellation signal before sending PUT", async () => {
  // Given
  const context = registrationContext();
  const admission = new AbortController();
  admission.abort();

  // When
  await createPushRegistration().register(
    context.owner,
    "synthetic-project",
    async () => ({ signal: admission.signal }),
    context.credentials,
  );

  // Then
  expect(mockFetch).not.toHaveBeenCalled();
});

it("creates Android's channel before requesting an Expo address", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "android");
  const context = registrationContext();

  // When
  await createPushRegistration().register(
    context.owner,
    "synthetic-project",
    context.request,
    context.credentials,
  );

  // Then
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
    "default",
    {
      name: "Notifications",
      importance: AndroidImportance.DEFAULT,
    },
  );
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "PUT"),
  ).toHaveLength(1);
});

it("bounds the whole removal even when credential retrieval never completes", async () => {
  // Given
  jest.useFakeTimers();
  const context = registrationContext();
  const push = createPushRegistration();
  context.credentials.mockImplementation(() => new Promise(() => undefined));
  await push.register(
    context.owner,
    "synthetic-project",
    context.request,
    context.credentials,
  );
  const removal = push.prepareRemoval();
  context.session.invalidate();

  // When
  const completed = jest.fn();
  const pending = removal?.({
    ...context.session.getSnapshot(),
    isCurrent: context.session.isCurrent,
  }).then(completed);
  await jest.advanceTimersByTimeAsync(3_000);
  await pending;

  // Then
  expect(completed).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "DELETE"),
  ).toHaveLength(0);
  expect(push.prepareRemoval()).toBeUndefined();
  expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
});

it("cancels controllable PUT but preserves the explicit already-transmitted limit", async () => {
  // Given
  const context = registrationContext();
  const push = createPushRegistration();
  const response = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(response.promise);
  const pending = push.register(
    context.owner,
    "synthetic-project",
    context.request,
    context.credentials,
  );
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  const [url, init] = mockFetch.mock.calls[0];

  // When
  const remove = push.prepareRemoval();
  context.session.invalidate();
  await remove?.({
    ...context.session.getSnapshot(),
    isCurrent: context.session.isCurrent,
  });
  response.resolve(
    Response.json({
      id: url.split("/").at(-1),
      installationId: JSON.parse(init.body).installationId,
    }),
  );
  await pending;

  // Then
  expect(init.signal.aborted).toBe(true);
  expect(
    mockFetch.mock.calls.filter(([, value]) => value.method === "DELETE"),
  ).toHaveLength(1);
  expect(mockFetch.mock.calls[1][0]).toBe(url);
});
