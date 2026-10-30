import { signInAccount } from "../test-support/sign-in-account";
import * as proSessionModule from "../pro-session";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { AppState } from "react-native";
import type { CustomerInfo } from "react-native-purchases";
import type { AccountSession } from "../../accounts";
import type { ProContext } from "../pro-provider";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { mockPurchases } from "../test-support/native-purchases";
import { prepareProNativeIO, ProHarness } from "../test-support/pro-harness";

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { revenueCat: { iosApiKey: "test_public" } } },
  },
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
let account: AccountSession;
let pro: ProContext;
let info: CustomerInfo;
const originalDomain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
const originalClient = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
beforeEach(() => {
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  // A fresh real owner isolates tests; remounts within one scenario retain it.
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  info = prepareProNativeIO();
});
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  if (originalDomain === undefined) delete process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
  else process.env.EXPO_PUBLIC_AUTH0_DOMAIN = originalDomain;
  if (originalClient === undefined)
    delete process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
  else process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = originalClient;
});
/** Mounts only the real owners; each scenario publishes and awaits its account explicitly. */
async function renderAccount() {
  return render(
    <ProHarness
      capture={(a, p) => {
        account = a;
        pro = p;
      }}
      onSupport={jest.fn()}
    />,
  );
}
it.each([
  "association",
  "explicit refresh",
  "foreground",
  "retry",
  "operation completion",
] as const)("publishes newly read rights after %s", async (trigger) => {
  // Given
  const foreground = jest.spyOn(AppState, "addEventListener");
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  if (trigger !== "association") {
    await act(() =>
      signInAccount(account, "00000000-0000-4000-8000-000000000001"),
    );
    await waitFor(() =>
      expect(account.accountId).toBe("00000000-0000-4000-8000-000000000001"),
    );
    await screen.findByText("Pro: inactive");
  }
  const stateChange = foreground.mock.calls
    .filter(([event]) => event === "change")
    .at(-1)?.[1];
  if (!stateChange)
    throw new Error("The Pro provider did not subscribe to AppState changes");
  const active = { "Blockout Pro": entitlement() };
  mockPurchases.getCustomerInfo.mockResolvedValueOnce(
    customerInfo({
      active,
      all: active,
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    }),
  );
  const readsBeforeTrigger = mockPurchases.getCustomerInfo.mock.calls.length;
  // When
  await act(async () => {
    switch (trigger) {
      case "association":
        await signInAccount(account, "00000000-0000-4000-8000-000000000001");
        break;
      case "explicit refresh":
        await pro.refresh();
        break;
      case "foreground":
        stateChange("active");
        break;
      case "retry":
        await pro.retry();
        break;
      case "operation completion":
        await pro.completeOperation("completed");
        break;
    }
  });
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000001"),
  );
  // Then
  expect(await screen.findByText("Pro: active")).toBeOnTheScreen();
  expect(mockPurchases.getCustomerInfo.mock.calls.length).toBeGreaterThan(
    readsBeforeTrigger,
  );
});
it("removes native subscriptions when the provider unmounts", async () => {
  // Given
  const foreground = jest.spyOn(AppState, "addEventListener");
  const view = await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  const listener =
    mockPurchases.addCustomerInfoUpdateListener.mock.calls.at(-1)![0];
  const subscriptionIndex = foreground.mock.calls.findIndex(
    ([event]) => event === "change",
  );
  if (subscriptionIndex < 0)
    throw new Error("The Pro provider did not subscribe to AppState changes");
  const removeForeground = jest.spyOn(
    foreground.mock.results[subscriptionIndex].value,
    "remove",
  );
  // When
  await view.unmount();
  // Then
  expect(mockPurchases.removeCustomerInfoUpdateListener).toHaveBeenCalledWith(
    listener,
  );
  expect(removeForeground).toHaveBeenCalledTimes(1);
});
it("rejects a detached read and callbacks after provider remount into the same business account", async () => {
  // Given
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000001"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000001"),
  );
  await screen.findByText("Pro: inactive");

  const listener =
    mockPurchases.addCustomerInfoUpdateListener.mock.calls.at(-1)![0];
  const read = Promise.withResolvers<CustomerInfo>();
  mockPurchases.getCustomerInfo.mockReturnValueOnce(read.promise);
  let refreshing: ReturnType<ProContext["refresh"]> | undefined;
  await act(() => {
    refreshing = pro.refresh();
    listener(info);
  });
  await cleanup();
  // When
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000001"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000001"),
  );
  await screen.findByText("Pro: inactive");
  const readsAfterRemount = mockPurchases.getCustomerInfo.mock.calls.length;
  const active = { "Blockout Pro": entitlement() };
  await act(async () => {
    read.resolve(
      customerInfo({
        active,
        all: active,
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    );
    await refreshing;
  });
  // Then
  expect(screen.getByText("Pro: inactive")).toBeOnTheScreen();
  expect(pro.state).toEqual({ status: "inactive", operation: "idle" });
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(
    readsAfterRemount,
  );
});
it("reads operation completion without waiting for an earlier read and rejects its late result", async () => {
  // Given
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000001"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000001"),
  );
  await screen.findByText("Pro: inactive");
  const earlier = Promise.withResolvers<CustomerInfo>();
  const active = { "Blockout Pro": entitlement() };
  mockPurchases.getCustomerInfo
    .mockReturnValueOnce(earlier.promise)
    .mockResolvedValueOnce(
      customerInfo({
        active,
        all: active,
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    );
  let refresh: ReturnType<ProContext["refresh"]> | undefined;
  let completion: Promise<void> | undefined;
  await act(() => {
    refresh = pro.refresh();
  });
  // When
  await act(() => {
    completion = pro.completeOperation("completed");
  });
  // Then: current operation evidence is usable while the unrelated earlier read is still pending.
  expect(screen.getByText("Pro: active")).toBeOnTheScreen();
  expect(pro.state).toEqual(
    expect.objectContaining({ operation: "completed" }),
  );
  // When
  await act(async () => {
    earlier.resolve(info);
    await refresh;
    await completion;
  });
  // Then
  expect(screen.getByText("Pro: active")).toBeOnTheScreen();
});
it("keeps current verification busy when an older read fails", async () => {
  // Given
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000001"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000001"),
  );
  await screen.findByText("Pro: inactive");
  const earlier = Promise.withResolvers<CustomerInfo>();
  const current = Promise.withResolvers<CustomerInfo>();
  mockPurchases.getCustomerInfo
    .mockReturnValueOnce(earlier.promise)
    .mockReturnValueOnce(current.promise);
  let first: ReturnType<ProContext["refresh"]> | undefined;
  let latest: ReturnType<ProContext["refresh"]> | undefined;
  await act(() => {
    first = pro.refresh();
    latest = pro.refresh();
  });
  // When
  await act(async () => {
    earlier.reject(new Error("synthetic old failure"));
    await first;
  });
  // Then
  expect(pro.refreshing).toBe(true);
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  // When
  const active = { "Blockout Pro": entitlement() };
  await act(async () => {
    current.resolve(
      customerInfo({
        active,
        all: active,
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    );
    await latest;
  });
  // Then
  expect(screen.getByText("Pro: active")).toBeOnTheScreen();
  expect(pro.refreshing).toBe(false);
});
it("ignores a queued listener from the removed principal before reading current B rights", async () => {
  // Given
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000001"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000001"),
  );
  await screen.findByText("Pro: inactive");
  const listener =
    mockPurchases.addCustomerInfoUpdateListener.mock.calls.at(-1)![0];
  const active = { "Blockout Pro": entitlement() };
  const oldPayload = customerInfo({
    active,
    all: active,
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000002"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000002"),
  );
  await screen.findByText("Pro: inactive");
  const read = Promise.withResolvers<CustomerInfo>();
  mockPurchases.getCustomerInfo.mockReturnValueOnce(read.promise);
  // When
  const readsBeforeEvent = mockPurchases.getCustomerInfo.mock.calls.length;
  await act(() => listener(oldPayload));
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(readsBeforeEvent);
  const currentListener =
    mockPurchases.addCustomerInfoUpdateListener.mock.calls.at(-1)![0];
  await act(() => currentListener(oldPayload));
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(
    readsBeforeEvent + 1,
  );
  // Then
  expect(screen.getByText("Pro: inactive")).toBeOnTheScreen();
  // When
  await act(() => read.resolve(info));
  // Then
  expect(screen.getByText("Pro: inactive")).toBeOnTheScreen();
});
it.each([
  { previousActive: false, expected: "active" },
  { previousActive: true, expected: "inactive" },
])(
  "reads SDK signals without waiting for an earlier read when current state becomes $expected",
  async ({ previousActive, expected }) => {
    // Given: SDK output is controlled; listener payloads have no F05 attribution.
    await renderAccount();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await act(() =>
      signInAccount(account, "00000000-0000-4000-8000-000000000001"),
    );
    await waitFor(() =>
      expect(account.accountId).toBe("00000000-0000-4000-8000-000000000001"),
    );
    await screen.findByText("Pro: inactive");
    const active = { "Blockout Pro": entitlement() };
    const activeInfo = customerInfo({
      active,
      all: active,
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    });
    const previous = previousActive ? activeInfo : info;
    const current = previousActive ? info : activeInfo;
    mockPurchases.getCustomerInfo.mockResolvedValueOnce(previous);
    await act(() => pro.refresh());
    const listener =
      mockPurchases.addCustomerInfoUpdateListener.mock.calls.at(-1)![0];
    const pending = Promise.withResolvers<CustomerInfo>();
    mockPurchases.getCustomerInfo
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(current);
    let refresh: ReturnType<ProContext["refresh"]> | undefined;
    await act(() => {
      refresh = pro.refresh();
    });
    // When: both signals read the SDK; their untagged payloads remain irrelevant.
    await act(() => {
      listener(previous);
      listener(previous);
    });
    // Then: current rights do not wait for the earlier promise, and its late result cannot replace them.
    expect(screen.getByText(`Pro: ${expected}`)).toBeOnTheScreen();
    // When
    await act(async () => {
      pending.resolve(previous);
      await refresh;
    });
    // Then
    expect(screen.getByText(`Pro: ${expected}`)).toBeOnTheScreen();
  },
);
it("ignores events during association and reads once after the current login settles", async () => {
  // Given
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000001"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000001"),
  );
  await screen.findByText("Pro: inactive");
  const login =
    Promise.withResolvers<Awaited<ReturnType<typeof mockPurchases.logIn>>>();
  mockPurchases.logIn.mockReturnValueOnce(login.promise);
  const listener =
    mockPurchases.addCustomerInfoUpdateListener.mock.calls.at(-1)![0];
  const readsBeforeSwitch = mockPurchases.getCustomerInfo.mock.calls.length;
  // When
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000002"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000002"),
  );
  await act(() => listener(info));
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(
    readsBeforeSwitch,
  );
  await act(() => login.resolve({ customerInfo: info, created: false }));
  // Then
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(
    readsBeforeSwitch + 1,
  );
  expect(await screen.findByText("Pro: inactive")).toBeOnTheScreen();
});
it("clears local rights before native logout settles, without waiting for RevenueCat", async () => {
  // Given
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000001"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000001"),
  );
  await screen.findByText("Pro: inactive");
  const active = { "Blockout Pro": entitlement() };
  mockPurchases.getCustomerInfo.mockResolvedValueOnce(
    customerInfo({
      active,
      all: active,
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    }),
  );
  await act(() => pro.refresh());
  expect(screen.getByText("Pro: active")).toBeOnTheScreen();
  const oldPro = pro;
  const logout = Promise.withResolvers<CustomerInfo>();
  mockPurchases.logOut.mockReturnValueOnce(logout.promise);
  // When
  await act(() => account.clearCredentials());
  // Then
  expect(account.status).toBe("guest");
  expect(screen.getByText("Pro: guest")).toBeOnTheScreen();
  expect(screen.getByText("Public sport")).toBeOnTheScreen();
  // When
  await act(() => oldPro.completeOperation("completed"));
  await act(() => logout.resolve(info));
  // Then
  expect(screen.getByText("Pro: guest")).toBeOnTheScreen();
});
