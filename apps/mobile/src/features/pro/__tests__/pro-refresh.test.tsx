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
import { mockClient } from "../../accounts/test-support/native-auth0";
import type { ProContext } from "../pro-provider";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { mockPurchases } from "../test-support/native-purchases";
import { prepareProNativeIO, ProHarness } from "../test-support/pro-harness";

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
jest.mock(require.resolve("react-native-auth0/src/Auth0.ts"), () => ({
  __esModule: true,
  default: jest.fn(() => mockClient),
}));
jest.mock("react-native-auth0", () =>
  jest
    .requireActual("../../accounts/test-support/native-auth0")
    .nativeAuth0Module(),
);

let account: AccountSession;
let pro: ProContext;
let info: CustomerInfo;
const originalDomain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
const originalClient = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
beforeEach(() => {
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

/** Mounts real providers and publishes a synthetic usable UUID through F05's actual boundary. */
async function mountAccount() {
  await render(
    <ProHarness
      capture={(a, p) => {
        account = a;
        pro = p;
      }}
      onSupport={jest.fn()}
    />,
  );
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000001",
    ),
  );
  await screen.findByText("Pro: inactive");
}

it("reads on association, ordinary entry, foreground, retry and operation completion, cleaning subscriptions", async () => {
  // Given
  const foreground = jest.spyOn(AppState, "addEventListener");
  await mountAccount();
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(1);

  // When
  await act(() => pro.refresh());
  const onChange = foreground.mock.calls[0][1];
  await act(() => onChange("active"));
  await act(() => pro.retry());
  await act(() => pro.completeOperation("completed"));
  const listener = mockPurchases.addCustomerInfoUpdateListener.mock.calls[0][0];
  const removeForeground = jest.spyOn(
    foreground.mock.results[0].value,
    "remove",
  );
  await cleanup();

  // Then
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(5);
  expect(mockPurchases.removeCustomerInfoUpdateListener).toHaveBeenCalledWith(
    listener,
  );
  expect(removeForeground).toHaveBeenCalledTimes(1);
});

it("rejects a detached read and callbacks after provider remount into the same business account", async () => {
  // Given
  await mountAccount();
  const detached = pro;
  const listener = mockPurchases.addCustomerInfoUpdateListener.mock.calls[0][0];
  const read = Promise.withResolvers<CustomerInfo>();
  mockPurchases.getCustomerInfo.mockReturnValueOnce(read.promise);
  let refreshing: Promise<void> | undefined;
  await act(() => {
    refreshing = pro.refresh();
    listener(info);
  });
  await cleanup();

  // When
  await mountAccount();
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
    await detached.completeOperation("completed");
    detached.retry();
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
  await mountAccount();
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
  let refresh: Promise<void> | undefined;
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
  await act(async () => {
    earlier.resolve(info);
    await refresh;
    await completion;
  });
  expect(screen.getByText("Pro: active")).toBeOnTheScreen();
});

it("keeps current verification busy when an older read fails", async () => {
  // Given
  await mountAccount();
  const earlier = Promise.withResolvers<CustomerInfo>();
  const current = Promise.withResolvers<CustomerInfo>();
  mockPurchases.getCustomerInfo
    .mockReturnValueOnce(earlier.promise)
    .mockReturnValueOnce(current.promise);
  let first: Promise<void> | undefined;
  let latest: Promise<void> | undefined;
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
  expect(screen.getByText("Pro: active")).toBeOnTheScreen();
  expect(pro.refreshing).toBe(false);
});

it("treats an old listener payload as a signal to read B rather than publish A's rights", async () => {
  // Given
  await mountAccount();
  const listener = mockPurchases.addCustomerInfoUpdateListener.mock.calls[0][0];
  const active = { "Blockout Pro": entitlement() };
  const oldPayload = customerInfo({
    active,
    all: active,
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000002",
    ),
  );
  await screen.findByText("Pro: inactive");
  const read = Promise.withResolvers<CustomerInfo>();
  mockPurchases.getCustomerInfo.mockReturnValueOnce(read.promise);

  // When
  const readsBeforeEvent = mockPurchases.getCustomerInfo.mock.calls.length;
  await act(() => listener(oldPayload));
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(
    readsBeforeEvent + 1,
  );

  // Then
  expect(screen.getByText("Pro: inactive")).toBeOnTheScreen();
  await act(() => read.resolve(info));
  expect(screen.getByText("Pro: inactive")).toBeOnTheScreen();
});

it.each([
  { previousActive: false, expected: "active" },
  { previousActive: true, expected: "inactive" },
])(
  "reads SDK signals without waiting for an earlier read when current state becomes $expected",
  async ({ previousActive, expected }) => {
    // Given: SDK output is controlled; listener payloads have no F05 attribution.
    await mountAccount();
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
      mockPurchases.addCustomerInfoUpdateListener.mock.calls[0][0];
    const pending = Promise.withResolvers<CustomerInfo>();
    mockPurchases.getCustomerInfo
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(current);
    let refresh: Promise<void> | undefined;
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
    await act(async () => {
      pending.resolve(previous);
      await refresh;
    });
    expect(screen.getByText(`Pro: ${expected}`)).toBeOnTheScreen();
  },
);

it("ignores events during association and reads once after the current login settles", async () => {
  // Given
  await mountAccount();
  const login =
    Promise.withResolvers<Awaited<ReturnType<typeof mockPurchases.logIn>>>();
  mockPurchases.logIn.mockReturnValueOnce(login.promise);
  const listener = mockPurchases.addCustomerInfoUpdateListener.mock.calls[0][0];

  // When
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000002",
    ),
  );
  await act(() => listener(info));
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(1);
  await act(() => login.resolve({ customerInfo: info, created: false }));

  // Then
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(2);
  expect(await screen.findByText("Pro: inactive")).toBeOnTheScreen();
});

it("clears local rights before native logout settles, without waiting for RevenueCat", async () => {
  // Given
  await mountAccount();
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
  await act(() => oldPro.completeOperation("completed"));
  expect(screen.getByText("Pro: guest")).toBeOnTheScreen();
  await act(() => logout.resolve(info));
});
