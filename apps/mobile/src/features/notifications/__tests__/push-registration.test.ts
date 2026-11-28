import AsyncStorage from "@react-native-async-storage/async-storage";
import { waitFor } from "@testing-library/react-native";
import { PermissionStatus } from "expo";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
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
  AndroidImportance: { DEFAULT: 3 },
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const env = { ...process.env };
const accountId = "00000000-0000-4000-8000-000000000001";

/** Real connection ownership and generated HTTP consumer; only native SDK/storage/network I/O is controlled. */
function registrationContext() {
  return {
    owner: { subject: "auth0|owner", accountId },
    request: jest.fn(async () => ({})),
    credentials: jest.fn(async () => ({ accessToken: "synthetic-token" })),
  };
}

beforeEach(async () => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  await AsyncStorage.clear();
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
      if (init.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      const body = JSON.parse(String(init.body));
      return Response.json({
        id: url.split("/").at(-1),
        installationId: body.installationId,
      });
    });
});

it("clears memory even when the exact HTTP removal fails", async () => {
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

  // When
  const removal = push.remove();
  await push.remove();
  await removal;

  // Then
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "DELETE"),
  ).toHaveLength(1);
  expect(context.credentials).toHaveBeenCalledTimes(1);
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
  await push.remove();
  await push.register(
    context.owner,
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

it("discards token acquisition after its connection is removed", async () => {
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
  await push.remove();
  token.resolve({ type: "expo", data: "ExponentPushToken[obsolete]" });
  await pending;

  // Then
  expect({
    credentialReads: context.credentials.mock.calls.length,
    methods: mockFetch.mock.calls.map(([, init]) => init.method),
  }).toEqual({ credentialReads: 0, methods: [] });
});

it("leaves without push credentials or requests after first permission denial", async () => {
  // Given
  const context = registrationContext();
  const push = createPushRegistration();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: false,
    canAskAgain: true,
    expires: "never",
    status: PermissionStatus.UNDETERMINED,
  });
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({
    granted: false,
    canAskAgain: false,
    expires: "never",
    status: PermissionStatus.DENIED,
  });

  // When
  await push.register(
    context.owner,
    "synthetic-project",
    context.request,
    context.credentials,
  );
  await push.remove();

  // Then
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  expect({
    credentialReads: context.credentials.mock.calls.length,
    methods: mockFetch.mock.calls.map(([, init]) => init.method),
  }).toEqual({ credentialReads: 0, methods: [] });
});

it("leaves without push credentials or requests when admission cancels before dispatch", async () => {
  // Given
  const context = registrationContext();
  const push = createPushRegistration();
  const admission = new AbortController();
  admission.abort();

  // When
  await push.register(
    context.owner,
    "synthetic-project",
    async () => ({ signal: admission.signal }),
    context.credentials,
  );
  await push.remove();

  // Then
  expect({
    credentialReads: context.credentials.mock.calls.length,
    methods: mockFetch.mock.calls.map(([, init]) => init.method),
  }).toEqual({ credentialReads: 0, methods: [] });
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

  // When
  const completed = jest.fn();
  const pending = push.remove().then(completed);
  await jest.advanceTimersByTimeAsync(3_000);
  await pending;
  await push.remove();

  // Then
  expect(completed).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "DELETE"),
  ).toHaveLength(0);
  expect(context.credentials).toHaveBeenCalledTimes(1);
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
  const removal = push.remove();
  const abortedBeforeWaiting = init.signal.aborted;
  await removal;
  response.resolve(
    Response.json({
      id: url.split("/").at(-1),
      installationId: JSON.parse(init.body).installationId,
    }),
  );
  await pending;

  // Then
  expect(abortedBeforeWaiting).toBe(true);
  expect(
    mockFetch.mock.calls.filter(([, value]) => value.method === "DELETE"),
  ).toHaveLength(1);
  expect(mockFetch.mock.calls[1][0]).toBe(url);
});

it("attempts one exact removal after a registration response is lost", async () => {
  // Given
  const context = registrationContext();
  const push = createPushRegistration();
  mockFetch.mockRejectedValueOnce(new Error("Registration response lost"));
  await push.register(
    context.owner,
    "synthetic-project",
    context.request,
    context.credentials,
  );

  // When
  await push.remove();
  await push.remove();

  // Then
  const [url] = mockFetch.mock.calls[0];
  expect(
    mockFetch.mock.calls.map(([destination, init]) => [
      destination,
      init.method,
    ]),
  ).toEqual([
    [url, "PUT"],
    [url, "DELETE"],
  ]);
  expect(context.credentials).toHaveBeenCalledTimes(1);
});

it("abandons in-flight push work for the erased account locally", async () => {
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
  const [, init] = mockFetch.mock.calls[0];

  // When
  push.abandon("00000000-0000-4000-8000-000000000002");
  const abortedAfterOtherAccount = init.signal.aborted;
  push.abandon(context.owner.accountId);
  response.reject(new Error("Registration response lost"));
  await pending;
  await push.remove();

  // Then
  expect(abortedAfterOtherAccount).toBe(false);
  expect(init.signal.aborted).toBe(true);
  expect(context.credentials).not.toHaveBeenCalled();
  expect(mockFetch.mock.calls.map(([, request]) => request.method)).toEqual([
    "PUT",
  ]);
});
