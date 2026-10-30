import { signInAccount } from "../../pro/test-support/sign-in-account";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { AccountSession } from "../../accounts";
import { useAccountSession } from "../../accounts/current-account";
import { usePro } from "../../pro";
import * as proSessionModule from "../../pro/pro-session";
import { mockPurchases } from "../../pro/test-support/native-purchases";
import {
  customerInfo,
  entitlement,
} from "../../pro/test-support/customer-info";
import { useAgeDeclaration } from "../age-declaration-provider";
import { useEffect, type ComponentType } from "react";
import { AccessibilityInfo, DeviceEventEmitter, Text } from "react-native";
import { readAgeDeclaration, submitAgeDeclaration } from "../age-declaration";
import RootLayout from "../../../app/_layout";
import AgeRoute from "../../../app/age-declaration";
import HomeRoute from "../../../app/(ordinary)/(tabs)/(home)/index";
import HomeLayout from "../../../app/(ordinary)/(tabs)/(home)/_layout";
import SeasonRoute from "../../../app/(ordinary)/(tabs)/(home)/(sheets)/season";
import OnboardingRoute from "../../../app/onboarding";
import SignInRoute from "../../../app/(ordinary)/sign-in";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  completeDiscovery,
  readDiscoveryCompletion,
} from "../../onboarding/discovery-state";
import { AccessGateScreen } from "../../access/screens/access-gate-screen";

jest.mock("expo-constants", () => {
  const actual = jest.requireActual("expo-constants");
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actual.default,
      expoConfig: {
        ...actual.default.expoConfig,
        extra: {
          ...actual.default.expoConfig?.extra,
          revenueCat: { iosApiKey: "test_public" },
        },
      },
    },
  };
});
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("expo-application", () => ({ nativeApplicationVersion: "2.9.0" }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    ...jest.requireActual("../../pro/test-support/native-purchases")
      .mockPurchases,
    restorePurchases: jest.fn(),
  },
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const environment = { ...process.env };
let account: AccountSession;
let installationAge: ReturnType<typeof useAgeDeclaration>;
beforeEach(async () => {
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  const inactive = customerInfo({
    active: {},
    all: {},
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.isConfigured.mockReset().mockResolvedValue(true);
  mockPurchases.isAnonymous.mockReset().mockResolvedValue(false);
  mockPurchases.getCustomerInfo.mockReset().mockResolvedValue(inactive);
  mockPurchases.logIn
    .mockReset()
    .mockResolvedValue({ customerInfo: inactive, created: false });
  mockPurchases.logOut.mockReset().mockResolvedValue(inactive);
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  await AsyncStorage.clear();
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|discovery"));
  mockAuth0.webAuth.mockReset();
  mockFetch
    .mockReset()
    .mockImplementation(async () => Response.json(applicationAccessResponse()));
});
afterEach(async () => {
  await cleanup();
  process.env = { ...environment };
  jest.restoreAllMocks();
  jest.useRealTimers();
});
/** Real root, session and installation owners; HTTP/SDK I/O and future destination content are controlled. */
async function openEntry(initialUrl = "/sign-in") {
  return renderRouter(
    {
      _layout: () => <RootLayout />,
      onboarding: OnboardingRoute,
      access: AccessGateScreen,
      "age-declaration": AgeRoute,
      "(operations)/_layout": () => <Stack />,
      "(operations)/administration/index": () => <Text>Operations</Text>,
      "(ordinary)/_layout": () => <Stack />,
      "(ordinary)/(home)/_layout": {
        default: HomeLayout,
        unstable_settings: { anchor: "index" },
      },
      "(ordinary)/(home)/index": HomeRoute,
      "(ordinary)/(home)/(sheets)/season": SeasonRoute,
      "(ordinary)/search": () => <Text>Public search</Text>,
      "(ordinary)/sign-in": SignInRoute,
      "(ordinary)/session": SessionProbe,
      "(ordinary)/legal": () => <Text>Public legal reading</Text>,
      "(ordinary)/support": () => <Text>Public support</Text>,
    },
    { initialUrl },
  );
}
/** Observes real public owner APIs so account transitions exercise storage independence and current Pro state. */
function SessionProbe() {
  const session = useAccountSession();
  useEffect(() => {
    account = session;
  }, [session]);
  const { state } = usePro();
  const age = useAgeDeclaration();
  useEffect(() => {
    installationAge = age;
  }, [age]);
  return (
    <>
      <Text>Session: {session.status}</Text>
      <Text>Pro: {state.status}</Text>
      <Text>Category: {age.category}</Text>
    </>
  );
}
it("persists one submitted age while the rendered form is busy", async () => {
  // Given
  await completeDiscovery();
  await openEntry("/session");
  await screen.findByText("Category: under16");
  const acknowledgement = Promise.withResolvers<void>();
  const write = jest
    .spyOn(AsyncStorage, "setItem")
    .mockReturnValueOnce(acknowledgement.promise);
  write.mockClear();
  let first: Promise<boolean> | undefined;
  let second: Promise<boolean> | undefined;
  // When
  await act(() => {
    first = installationAge.confirm(16);
  });
  await act(() => {
    second = installationAge.confirm(18);
  });
  // Then
  expect(write).toHaveBeenCalledTimes(1);
  expect(first).toBeInstanceOf(Promise);
  expect(second).toBeUndefined();
  expect(JSON.parse(write.mock.calls[0][1])).toEqual({
    category: "16–17",
    declaredAt: expect.any(String),
  });
  expect(screen.getByText("Category: under16")).toBeOnTheScreen();
  // When
  await act(() => {
    acknowledgement.resolve();
  });
  await expect(first).resolves.toBe(true);
  // Then
  expect(screen.getByText("Category: 16–17")).toBeOnTheScreen();
  expect(write).toHaveBeenCalledTimes(1);
});
it("keeps the mounted guest age form busy through guest departure and its pending installation write", async () => {
  // Given
  await completeDiscovery();
  await openEntry("/");
  const user = userEvent.setup();
  await fireEvent(await screen.findByRole("adjustable"), "change", {
    nativeEvent: { value: 16 },
  });
  const acknowledgement = Promise.withResolvers<void>();
  const write = jest
    .spyOn(AsyncStorage, "setItem")
    .mockReturnValueOnce(acknowledgement.promise);
  write.mockClear();
  await user.press(screen.getByRole("button", { name: "Continuer" }));
  await screen.findByRole("button", { name: "Continuer", busy: true });
  // When — the installation owner remains mounted while navigation discards the form and F05 changes.
  await act(async () => router.replace("/session"));
  await screen.findByText("Session: guest");
  await act(async () => account.clearCredentials());
  await act(async () => router.replace("/"));
  // Then — a fresh neutral draft cannot accept a second age during the first write.
  expect(await screen.findByText("—")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Continuer", busy: true }),
  ).toBeDisabled();
  expect(screen.getByRole("adjustable")).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Augmenter l’âge" }),
  ).toBeDisabled();
  // When
  await user.press(screen.getByRole("button", { name: "Augmenter l’âge" }));
  // Then
  expect(write).toHaveBeenCalledTimes(1);
  // When
  await act(async () => acknowledgement.resolve());
  await act(async () => router.replace("/session"));
  // Then
  expect(await screen.findByText("Category: 16–17")).toBeOnTheScreen();
  expect(write).toHaveBeenCalledTimes(1);
  expect(JSON.parse(write.mock.calls[0][1])).toMatchObject({
    category: "16–17",
  });
});
it("guards ordinary home after guest selection even when discovery was skipped", async () => {
  // Given
  const user = userEvent.setup();
  await openEntry("/");
  await user.press(await screen.findByRole("button", { name: "Passer" }));
  expect(
    await screen.findByRole("button", { name: "Se connecter" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("adjustable")).toBeNull();
  // When
  await user.press(
    await screen.findByRole("button", { name: "Continuer en tant qu’invité" }),
  );
  // Then
  expect(
    await screen.findByRole("header", { name: "Quel est votre âge ?" }),
  ).toBeOnTheScreen();
  expect(await readDiscoveryCompletion()).toBe(true);
});
it("keeps back/restart unconfirmed and preserves completed discovery", async () => {
  // Given
  await completeDiscovery();
  const view = await openEntry("/");
  expect(
    await screen.findByRole("header", { name: "Quel est votre âge ?" }),
  ).toBeOnTheScreen();
  // When
  await act(async () => router.replace("/"));
  await view.unmount();
  await openEntry("/");
  // Then
  expect(
    await screen.findByRole("button", { name: "Continuer" }),
  ).toBeDisabled();
  expect(await readAgeDeclaration()).toBeNull();
  expect(await readDiscoveryCompletion()).toBe(true);
});
it.each(["/legal", "/support", "/sign-in"])(
  "leaves independent %s available without a declaration",
  async (path) => {
    // Given
    await completeDiscovery();
    // When: ordinary Query retries finish before the blocking failure is presented.
    jest.useFakeTimers();
    await openEntry(path);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(8000);
    });
    // Then
    if (path === "/sign-in")
      expect(
        await screen.findByRole("button", { name: "Se connecter" }),
      ).toBeOnTheScreen();
    else
      expect(
        await screen.findByText(
          path === "/legal" ? "Public legal reading" : "Public support",
        ),
      ).toBeOnTheScreen();
    expect(await readAgeDeclaration()).toBeNull();
  },
);
it.each(["/age-declaration", "/legal", "/support", "/sign-in"])(
  "preserves the F12 gate for %s",
  async (path) => {
    // Given
    await completeDiscovery();
    mockFetch.mockRejectedValue(new Error("Unavailable"));
    // When: ordinary Query retries finish before the blocking failure is presented.
    jest.useFakeTimers();
    await openEntry(path);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(8000);
    });
    // Then
    expect(
      await screen.findByText("Une erreur est survenue"),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("adjustable")).toBeNull();
    expect(await readAgeDeclaration()).toBeNull();
  },
);
it("reuses the form for annual minor renewal and preserves storage when interrupted", async () => {
  // Given
  await completeDiscovery();
  const previous = await submitAgeDeclaration(17, new Date(2024, 0, 1));
  const view = await openEntry("/");
  expect(
    await screen.findByRole("header", {
      name: "Quel âge avez-vous aujourd’hui ?",
    }),
  ).toBeOnTheScreen();
  // When
  await fireEvent(screen.getByRole("adjustable"), "change", {
    nativeEvent: { value: 18 },
  });
  await view.unmount();
  await openEntry("/");
  // Then
  expect(
    await screen.findByRole("button", { name: "Continuer" }),
  ).toBeDisabled();
  expect(await readAgeDeclaration()).toEqual(previous);
});
it("persists confirmation across a later launch without annual adult prompts or discovery replay", async () => {
  // Given
  await completeDiscovery();
  const user = userEvent.setup();
  const view = await openEntry("/");
  await fireEvent(await screen.findByRole("adjustable"), "change", {
    nativeEvent: { value: 18 },
  });
  // When
  await user.press(screen.getByRole("button", { name: "Continuer" }));
  await waitFor(() => expect(screen).toHavePathname("/search"));
  await view.unmount();
  await openEntry("/");
  // Then
  await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
  expect(screen.queryByRole("adjustable")).toBeNull();
  expect((await readAgeDeclaration())?.category).toBe("adult");
  expect(await readDiscoveryCompletion()).toBe(true);
});
it("offers an explicit storage-read retry without declaring a default age", async () => {
  // Given
  await completeDiscovery();
  jest
    .spyOn(AsyncStorage, "getItem")
    .mockResolvedValueOnce("true")
    .mockRejectedValueOnce(new Error("Storage"));
  const user = userEvent.setup();
  await openEntry("/");
  await screen.findByRole("alert", {
    name: "Une erreur est survenue",
  });
  expect(screen.queryByRole("adjustable")).toBeNull();
  expect(
    screen.queryByRole("header", { name: "Quel est votre âge ?" }),
  ).toBeNull();
  // When
  await user.press(await screen.findByRole("button", { name: "Réessayer" }));
  // Then
  expect(
    await screen.findByRole("button", { name: "Continuer" }),
  ).toBeDisabled();
  expect(await readAgeDeclaration()).toBeNull();
});
it("avoids prompting known active Pro without transferring that exemption to a guest", async () => {
  // Given
  await completeDiscovery();
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const active = { "Blockout Pro": entitlement() };
  const info = customerInfo({
    active,
    all: active,
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.logIn.mockResolvedValue({ customerInfo: info, created: false });
  mockPurchases.getCustomerInfo.mockResolvedValue(info);
  await openEntry("/session");
  await screen.findByText("Session: authenticated");
  await act(async () => {
    await signInAccount(account, "de5a2574-561b-48f5-9d2a-b96e55109b07");
  });
  await waitFor(() =>
    expect(
      proSessionModule.proSession.getSnapshot().evidence?.session.accountId,
    ).toBe("de5a2574-561b-48f5-9d2a-b96e55109b07"),
  );
  await act(() => router.replace("/session"));
  await screen.findByText("Session: authenticated");
  await screen.findByText("Pro: active");
  // When
  await act(async () => router.replace("/"));
  // Then
  await waitFor(() => expect(screen).toHavePathname("/"));
  expect(screen.queryByRole("adjustable")).toBeNull();
  expect(await readAgeDeclaration()).toBeNull();
  // When
  await act(async () => router.replace("/session"));
  await act(async () => account.clearCredentials());
  await act(async () => router.replace("/"));
  // Then
  expect(
    await screen.findByRole("button", { name: "Continuer" }),
  ).toBeDisabled();
});
it("keeps one installation declaration through account replacement, local logout and tree recreation", async () => {
  // Given
  await completeDiscovery();
  const previous = await submitAgeDeclaration(16);
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const view = await openEntry("/session");
  await screen.findByText("Session: authenticated");
  // When
  await act(async () => {
    await signInAccount(account, "de5a2574-561b-48f5-9d2a-b96e55109b07");
  });
  await waitFor(() =>
    expect(
      proSessionModule.proSession.getSnapshot().evidence?.session.accountId,
    ).toBe("de5a2574-561b-48f5-9d2a-b96e55109b07"),
  );
  await act(() => router.replace("/session"));
  await screen.findByText("Session: authenticated");
  await act(async () => {
    await signInAccount(account, "47256650-ac7c-4c39-926b-f521b754a3c1");
  });
  await waitFor(() =>
    expect(
      proSessionModule.proSession.getSnapshot().evidence?.session.accountId,
    ).toBe("47256650-ac7c-4c39-926b-f521b754a3c1"),
  );
  await act(() => router.replace("/session"));
  await screen.findByText("Session: authenticated");
  await act(async () => account.clearCredentials());
  await view.unmount();
  await openEntry("/session");
  // Then
  expect(await screen.findByText("Category: 16–17")).toBeOnTheScreen();
  expect(await readAgeDeclaration()).toEqual(previous);
  expect(await readDiscoveryCompletion()).toBe(true);
});
it("retains the unconfirmed choice across a live reduced-motion change", async () => {
  // Given
  await completeDiscovery();
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockResolvedValue(false);
  await openEntry("/");
  await fireEvent(await screen.findByRole("adjustable"), "change", {
    nativeEvent: { value: 17 },
  });
  // When
  await act(async () => {
    DeviceEventEmitter.emit("reduceMotionChanged", true);
  });
  // Then
  expect(screen.getByText("17")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Continuer" })).toBeEnabled();
  expect(await readAgeDeclaration()).toBeNull();
});
it("guards a signed-in free account’s home independently of its account identity", async () => {
  // Given
  await completeDiscovery();
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  await openEntry("/session");
  await screen.findByText("Session: authenticated");
  await act(async () => {
    await signInAccount(account, "de5a2574-561b-48f5-9d2a-b96e55109b07");
  });
  await waitFor(() =>
    expect(
      proSessionModule.proSession.getSnapshot().evidence?.session.accountId,
    ).toBe("de5a2574-561b-48f5-9d2a-b96e55109b07"),
  );
  await act(() => router.replace("/session"));
  await screen.findByText("Session: authenticated");
  await screen.findByText("Pro: inactive");
  // When
  await act(async () => router.replace("/"));
  // Then
  expect(
    await screen.findByRole("button", { name: "Continuer" }),
  ).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: /Passer|Fermer|Retour/ }),
  ).toBeNull();
  expect(await readAgeDeclaration()).toBeNull();
});
it("keeps public legal navigation available while local age storage is pending", async () => {
  // Given
  await completeDiscovery();
  const read = Promise.withResolvers<string | null>();
  jest
    .spyOn(AsyncStorage, "getItem")
    .mockResolvedValueOnce("true")
    .mockReturnValueOnce(read.promise);
  // When
  await openEntry("/legal");
  // Then
  expect(await screen.findByText("Public legal reading")).toBeOnTheScreen();
  expect(screen.queryByRole("adjustable")).toBeNull();
  // When
  await act(async () => read.resolve(null));
  // Then
  expect(await readAgeDeclaration()).toBeNull();
});
it("ignores an obsolete installation read after a new tree loads the current declaration", async () => {
  // Given
  await completeDiscovery();
  await submitAgeDeclaration(18);
  const previous = Promise.withResolvers<string | null>();
  jest
    .spyOn(AsyncStorage, "getItem")
    .mockResolvedValueOnce("true")
    .mockReturnValueOnce(previous.promise);
  const first = await openEntry("/legal");
  // When
  await first.unmount();
  await openEntry("/session");
  await screen.findByText("Category: adult");
  await act(async () => previous.resolve(null));
  // Then
  expect(screen.getByText("Category: adult")).toBeOnTheScreen();
  expect((await readAgeDeclaration())?.category).toBe("adult");
});
