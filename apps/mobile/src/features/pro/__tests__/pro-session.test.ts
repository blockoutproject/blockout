import type { SessionSnapshot } from "../../accounts";
import { waitFor } from "@testing-library/react-native";
import Purchases from "react-native-purchases";
import { createProSession } from "../pro-session";
import { customerInfo, entitlement } from "../test-support/customer-info";

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
const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
const info = customerInfo({
  active: {},
  all: {},
  verification: Purchases.VERIFICATION_RESULT.NOT_REQUESTED,
});
let session: SessionSnapshot;
let owner: ReturnType<typeof createProSession>;
beforeEach(() => {
  jest.clearAllMocks();
  let configured = false;
  jest.mocked(Purchases.configure).mockImplementation(() => {
    configured = true;
  });
  jest
    .mocked(Purchases.isConfigured)
    .mockReset()
    .mockImplementation(async () => configured);
  jest.mocked(Purchases.isAnonymous).mockResolvedValue(false);
  jest
    .mocked(Purchases.logIn)
    .mockResolvedValue({ customerInfo: info, created: false });
  jest.mocked(Purchases.logOut).mockResolvedValue(info);
  jest.mocked(Purchases.getCustomerInfo).mockResolvedValue(info);
  session = { subject: null, accountId: null };
  owner = createProSession();
  // Real F05 publication, with only RevenueCat I/O controlled.
});
it("waits for a usable UUID before configuring once and reading current information", async () => {
  // Given
  owner.setTarget({ ...session });
  expect(Purchases.configure).not.toHaveBeenCalled();
  // When
  session = { subject: `auth0|${a}`, accountId: a };
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
  );
  session = { subject: `auth0|${b}`, accountId: b };
  owner.setTarget(session);
  // Then
  await waitFor(() => expect(Purchases.logIn).toHaveBeenCalledWith(b));
  expect(Purchases.configure).toHaveBeenCalledTimes(1);
  expect(Purchases.configure).toHaveBeenCalledWith({
    apiKey: "test_public",
    appUserID: a,
  });
});
it("accepts current login-supplied rights without another information read", async () => {
  // Given
  session = { subject: `auth0|${a}`, accountId: a };
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
  );
  const active = { "Blockout Pro": entitlement() };
  const loginInfo = customerInfo({
    active,
    all: active,
    verification: Purchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  jest
    .mocked(Purchases.logIn)
    .mockResolvedValueOnce({ customerInfo: loginInfo, created: false });
  jest.mocked(Purchases.getCustomerInfo).mockClear();
  // When
  session = { subject: `auth0|${b}`, accountId: b };
  owner.setTarget(session);
  // Then
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(loginInfo),
  );
  expect(owner.getSnapshot().read).toBeNull();
  expect(owner.getSnapshot().verificationFailed).toBe(false);
  expect(Purchases.getCustomerInfo).not.toHaveBeenCalled();
});

it.each(["completed", "failed"])(
  "retires an older %s read when a current operation supplies information",
  async (outcome) => {
    // Given
    session = { subject: `auth0|${a}`, accountId: a };
    owner.setTarget(session);
    await waitFor(() =>
      expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
    );
    jest
      .mocked(Purchases.getCustomerInfo)
      .mockRejectedValueOnce(new Error("Synthetic verification failure"));
    await owner.refresh(session);
    expect(owner.getSnapshot().verificationFailed).toBe(true);
    const earlier = Promise.withResolvers<typeof info>();
    jest.mocked(Purchases.getCustomerInfo).mockReturnValueOnce(earlier.promise);
    const reading = owner.refresh(session);
    const supplied = {
      ...info,
      originalAppUserId: "current-synthetic-customer",
    };
    const reads = jest.mocked(Purchases.getCustomerInfo).mock.calls.length;

    // When
    await owner.completeOperation(session, "restored", supplied);

    // Then
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(supplied);
    expect(owner.getSnapshot().read).toBeNull();
    expect(owner.getSnapshot().verificationFailed).toBe(false);
    expect(Purchases.getCustomerInfo).toHaveBeenCalledTimes(reads);

    // When
    if (outcome === "completed") earlier.resolve(info);
    else earlier.reject(new Error("Obsolete native read"));
    await reading;

    // Then
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(supplied);
    expect(owner.getSnapshot().verificationFailed).toBe(false);
  },
);
it("finishes configuration before logging out when its account is erased", async () => {
  // Given
  const configured = Promise.withResolvers<boolean>();
  jest
    .mocked(Purchases.isConfigured)
    .mockResolvedValueOnce(false)
    .mockReturnValueOnce(configured.promise);
  session = { subject: `auth0|${a}`, accountId: a };
  owner.setTarget(session);
  await waitFor(() => expect(Purchases.configure).toHaveBeenCalledTimes(1));
  // When
  session = { subject: null, accountId: null };
  owner.setTarget(session);
  // Then
  expect(owner.getSnapshot().evidence).toBeNull();
  expect(Purchases.logOut).not.toHaveBeenCalled();
  // When
  configured.resolve(true);
  // Then
  await waitFor(() => expect(Purchases.logOut).toHaveBeenCalledTimes(1));
  expect(Purchases.getCustomerInfo).not.toHaveBeenCalled();
});
it.each([a, b])(
  "settles configuration before applying the latest target %s, skipping obsolete guests",
  async (target) => {
    // Given: configure is void; isConfigured is the SDK's asynchronous setup check.
    const configured = Promise.withResolvers<boolean>();
    jest
      .mocked(Purchases.isConfigured)
      .mockResolvedValueOnce(false)
      .mockReturnValueOnce(configured.promise);
    session = { subject: `auth0|${a}`, accountId: a };
    owner.setTarget(session);
    await waitFor(() => expect(Purchases.configure).toHaveBeenCalledTimes(1));
    // When
    session = { subject: null, accountId: null };
    owner.setTarget(session);
    session = { subject: `auth0|${target}`, accountId: target };
    owner.setTarget(session);
    expect(owner.getSnapshot().evidence?.customerInfo ?? null).toBeNull();
    expect(Purchases.logIn).not.toHaveBeenCalled();
    expect(Purchases.logOut).not.toHaveBeenCalled();
    configured.resolve(true);
    // Then
    await waitFor(() =>
      expect(owner.getSnapshot().evidence?.session).toEqual({ ...session }),
    );
    await waitFor(() =>
      expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
    );
    expect(Purchases.logIn).toHaveBeenCalledTimes(target === a ? 0 : 1);
    if (target !== a) expect(Purchases.logIn).toHaveBeenCalledWith(target);
    expect(Purchases.logOut).not.toHaveBeenCalled();
  },
);
it("clears immediately on accepted erasure and waits for login before native logout", async () => {
  // Given
  session = { subject: `auth0|${a}`, accountId: a };
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
  );
  const login =
    Promise.withResolvers<Awaited<ReturnType<typeof Purchases.logIn>>>();
  jest.mocked(Purchases.logIn).mockReturnValueOnce(login.promise);
  session = { subject: `auth0|${b}`, accountId: b };
  owner.setTarget(session);
  // When
  session = { subject: null, accountId: null };
  owner.setTarget(session);
  // Then
  expect(owner.getSnapshot().evidence).toBeNull();
  expect(Purchases.logOut).not.toHaveBeenCalled();
  // When
  login.resolve({ customerInfo: info, created: false });
  // Then
  await waitFor(() => expect(Purchases.logOut).toHaveBeenCalledTimes(1));
  expect(owner.getSnapshot().evidence).toBeNull();
});
it("waits for logout before login and skips an intermediate known account", async () => {
  // Given
  session = { subject: `auth0|${a}`, accountId: a };
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
  );
  const logout = Promise.withResolvers<typeof info>();
  jest.mocked(Purchases.logOut).mockReturnValueOnce(logout.promise);
  session = { subject: null, accountId: null };
  owner.setTarget(session);
  await waitFor(() => expect(Purchases.logOut).toHaveBeenCalledTimes(1));
  // When
  session = { subject: `auth0|${b}`, accountId: b };
  owner.setTarget(session);
  session = { subject: `auth0|${a}`, accountId: a };
  owner.setTarget(session);
  expect(Purchases.logIn).not.toHaveBeenCalled();
  logout.resolve(info);
  // Then
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
  );
  expect(Purchases.logIn).toHaveBeenCalledTimes(1);
  expect(Purchases.logIn).toHaveBeenCalledWith(a);
});
it("leaves a failed current association unavailable until explicit retry", async () => {
  // Given
  session = { subject: `auth0|${a}`, accountId: a };
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
  );
  jest
    .mocked(Purchases.logIn)
    .mockRejectedValueOnce(new Error("private SDK payload"));
  session = { subject: `auth0|${b}`, accountId: b };
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.association).toBe("failed"),
  );
  // When
  owner.setTarget({ ...session });
  await owner.refresh({ ...session });
  expect(Purchases.logIn).toHaveBeenCalledTimes(1);
  owner.retry({ ...session });
  // Then
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
  );
  expect(Purchases.logIn).toHaveBeenCalledTimes(2);
});
it.each([a, b])("rejects an old read across A → guest → %s", async (target) => {
  // Given
  const read = Promise.withResolvers<typeof info>();
  jest.mocked(Purchases.getCustomerInfo).mockReturnValueOnce(read.promise);
  session = { subject: `auth0|${a}`, accountId: a };
  owner.setTarget(session);
  await waitFor(() =>
    expect(Purchases.getCustomerInfo).toHaveBeenCalledTimes(1),
  );
  const old = { ...session };
  // When
  session = { subject: null, accountId: null };
  owner.setTarget(session);
  session = { subject: `auth0|${target}`, accountId: target };
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
  );
  read.resolve({ ...info, originalAppUserId: "obsolete-synthetic-customer" });
  await read.promise;
  await owner.refresh(old);
  owner.retry(old);
  // Then
  expect(owner.getSnapshot().evidence?.session).toEqual({ ...session });
  expect(owner.getSnapshot().evidence?.customerInfo).toBe(info);
  expect(Purchases.configure).toHaveBeenCalledTimes(1);
});
it("uses SDK configuration when a React owner is recreated", async () => {
  // Given: the native process already configured RevenueCat before this owner existed.
  jest.mocked(Purchases.isConfigured).mockResolvedValue(true);
  // When
  session = { subject: `auth0|${a}`, accountId: a };
  owner.setTarget(session);
  // Then
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
  );
  expect(Purchases.configure).not.toHaveBeenCalled();
  expect(Purchases.logIn).toHaveBeenCalledWith(a);
});
it("abandons an obsolete account before mutating native identity after an SDK configuration read", async () => {
  // Given
  const configured = Promise.withResolvers<boolean>();
  jest.mocked(Purchases.isConfigured).mockReturnValueOnce(configured.promise);
  session = { subject: `auth0|${a}`, accountId: a };
  owner.setTarget(session);
  // When
  session = { subject: `auth0|${b}`, accountId: b };
  owner.setTarget(session);
  configured.resolve(false);
  // Then
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
  );
  expect(Purchases.configure).toHaveBeenCalledTimes(1);
  expect(Purchases.configure).toHaveBeenCalledWith({
    apiKey: "test_public",
    appUserID: b,
  });
  expect(Purchases.logIn).not.toHaveBeenCalled();
});
