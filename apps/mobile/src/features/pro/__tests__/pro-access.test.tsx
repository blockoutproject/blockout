import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { useEffect, type ComponentProps, type ComponentType } from "react";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import RevenueCatUI from "react-native-purchases-ui";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";
import OrdinaryLayout from "../../../app/(ordinary)/_layout";
import "../../../shared/native/test-support/tab-view-native";
import { useAccountSession } from "../../accounts/current-account";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { submitAgeDeclaration } from "../../advertising/age-declaration";
import { nativeAdvertising } from "../../advertising/test-support/native-privacy";
import { controlledInterstitial } from "../../advertising/test-support/interstitial";
import { completeDiscovery } from "../../onboarding/discovery-state";
import {
  consultationResponse,
  matchDetail,
  sportingId,
} from "../../sporting/test-support/consultation-data";
import { usePro } from "../index";
import * as proSessionModule from "../pro-session";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { mockPurchases } from "../test-support/native-purchases";
import { v2Offering } from "../test-support/offering";

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("expo-application", () => ({ nativeApplicationVersion: "2.9.0" }));
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
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
          revenueCat: { iosApiKey: "test_public", offeringIdentifier: "v2" },
          advertising: {
            iosInterstitialUnitId: "synthetic-unit",
            androidInterstitialUnitId: "synthetic-unit",
          },
        },
      },
    },
  };
});
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));
jest.mock("react-native-purchases-ui", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: {
      Paywall: (props: ComponentProps<typeof RevenueCatUI.Paywall>) => {
        mockPaywall = props;
        return <Text>Native store offer</Text>;
      },
      CustomerCenterView: () => <Text>Native purchase management</Text>,
    },
  };
});
jest.mock("react-native-google-mobile-ads", () => ({
  ...jest.requireActual("../../advertising/test-support/native-privacy")
    .nativeAdvertising,
  AdEventType: {
    LOADED: "loaded",
    OPENED: "opened",
    CLOSED: "closed",
    ERROR: "error",
  },
  InterstitialAd: { createForAdRequest: jest.fn(() => mockCreateAd()) },
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const mockCreateAd = jest.fn(controlledInterstitial);
let mockPaywall: ComponentProps<typeof RevenueCatUI.Paywall>;
let owners: {
  session: ReturnType<typeof useAccountSession>;
  pro: ReturnType<typeof usePro>;
};
const environment = { ...process.env };
const accountId = "00000000-0000-4000-8000-000000000305";
const poolPath = `/pools/${sportingId}`;
const clubPath = `/clubs/${sportingId}`;
let mockAccount: AccountResponse;

/** SDK evidence only: active maps are authoritative even when fixture dates are historical. */
function rights(store: "APP_STORE" | "PROMOTIONAL") {
  const active = { "Blockout Pro": entitlement({ store }) };
  return customerInfo({
    active,
    all: active,
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
}

beforeEach(async () => {
  mockAccount = accountResponse({ accountId });
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  await AsyncStorage.clear();
  await AsyncStorage.setItem("blockout:v2-initialized", "true");
  await completeDiscovery();
  await submitAgeDeclaration(18);
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  mockAuth0.hasValidAuth0InstanceWithConfiguration
    .mockReset()
    .mockResolvedValue(true);
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|pro-access"));
  mockAuth0.clearCredentials.mockReset().mockImplementation(async () => {
    mockAuth0.hasValidCredentials.mockResolvedValue(false);
    mockAuth0.getCredentials.mockRejectedValue({
      code: "no_credentials",
      message: "No credentials",
    });
  });
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  const inactive = customerInfo({
    active: {},
    all: {},
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  let configured = false;
  mockPurchases.configure.mockReset().mockImplementation(() => {
    configured = true;
  });
  mockPurchases.isConfigured
    .mockReset()
    .mockImplementation(async () => configured);
  mockPurchases.isAnonymous.mockReset().mockResolvedValue(false);
  mockPurchases.logIn
    .mockReset()
    .mockResolvedValue({ customerInfo: inactive, created: false });
  mockPurchases.logOut.mockReset().mockResolvedValue(inactive);
  mockPurchases.getCustomerInfo.mockReset().mockResolvedValue(inactive);
  mockPurchases.restorePurchases.mockReset().mockResolvedValue(inactive);
  mockPurchases.getOfferings
    .mockReset()
    .mockResolvedValue({ current: null, all: { v2: v2Offering } });
  mockCreateAd.mockReset().mockImplementation(controlledInterstitial);
  jest.mocked(InterstitialAd.createForAdRequest).mockClear();
  nativeAdvertising.AdsConsent.gatherConsent.mockClear();
  jest.mocked(requestTrackingPermissionsAsync).mockClear();
  mockFetch.mockReset().mockImplementation(async (url) => {
    const parsed = new URL(String(url));
    const path = parsed.pathname;
    if (path === "/accounts/me") return Response.json(mockAccount);
    if (path.endsWith("/notification-summary"))
      return Response.json({ unreadCount: 0 });
    if (path.endsWith("/follow-options")) return Response.json({ seasons: [] });
    if (path.endsWith("/follower-count")) return Response.json({ count: 2 });
    if (/\/(pool|team)-follows\//.test(path))
      return Response.json({ following: false });
    if (path.endsWith("/participants"))
      return Response.json({
        poolId: sportingId,
        items: [
          {
            team: {
              team: { id: sportingId, name: "Rives" },
              season: matchDetail().match.pool.season,
              classification: {},
              professional: false,
              club: { id: sportingId, name: "Club des Rives" },
            },
            location: {
              latitude: 46.16,
              longitude: -1.15,
              label: "La Rochelle",
            },
          },
        ],
      });
    if (path === "/matches") {
      const category = parsed.searchParams.get("category");
      const next = parsed.searchParams.has("nextDay");
      const date = next
        ? category === "upcoming"
          ? "2026-10-26"
          : "2026-10-24"
        : "2026-10-25";
      const match = {
        ...matchDetail().match,
        id: next ? "00000000-0000-4000-8000-000000000306" : sportingId,
        category,
        home: {
          id: sportingId,
          name: `${category} ${next ? "continuation" : "first"}`,
        },
        schedule: { ...matchDetail().match.schedule, localDate: date },
      };
      return Response.json({
        category,
        timeZone: parsed.searchParams.get("timeZone"),
        evaluatedAt: "2026-10-31T12:00:00Z",
        days: [
          {
            date,
            pools: [{ poolId: sportingId, matches: [match] }],
          },
        ],
        ...(!next ? { nextDay: "2026-10-25" } : {}),
      });
    }
    return consultationResponse(String(url), matchDetail());
  });
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
  process.env = { ...environment };
});

/** Passively observes production owners; tests never supply entitlement, session or eligibility state. */
function OwnerObservation() {
  const session = useAccountSession();
  const pro = usePro();
  useEffect(() => {
    owners = { session, pro };
  });
  return null;
}

/** Preserves all production route content and adds observation beside the ordinary navigator. */
function ObservedOrdinaryLayout() {
  return (
    <>
      <OwnerObservation />
      <OrdinaryLayout />
    </>
  );
}

/** Loads the actual root, routes, generated queries and state owners with native/network I/O doubles. */
async function openInstallation(initialUrl = poolPath) {
  await renderRouter(
    {
      appDir: "src/app",
      overrides: { "(ordinary)/_layout": ObservedOrdinaryLayout },
    },
    { initialUrl },
  );
  await screen.findByRole("tab", { name: "Carte" });
}

/** Exercises map selection plus both complete-day club traversals through their actual route/query owners. */
async function consultPublicSport() {
  const user = userEvent.setup();
  await user.press(screen.getByRole("tab", { name: "Carte" }));
  const marker = await screen.findByRole("button", {
    name: "La Rochelle: Rives",
  });
  // MarkerPress and list endReached are native events outside userEvent's supported controls.
  await fireEvent(marker, "press", { stopPropagation: jest.fn() });
  expect(
    await screen.findByRole("link", { name: "Voir l’équipe" }),
  ).toBeEnabled();
  expect(screen).toHavePathname(poolPath);
  await act(() => router.push(clubPath));
  await screen.findByRole("tab", { name: "À venir" });
  for (const [label, category] of [
    ["À venir", "upcoming"],
    ["Terminés", "completed"],
  ]) {
    await user.press(screen.getByRole("tab", { name: label }));
    await screen.findByRole("link", {
      name: new RegExp(`Ouvrir le match ${category} first`),
    });
    await fireEvent(
      screen.getByRole("link", {
        name: new RegExp(`Ouvrir le match ${category} first`),
      }),
      "endReached",
    );
    expect(
      await screen.findByRole("link", {
        name: new RegExp(`Ouvrir le match ${category} continuation`),
      }),
    ).toBeEnabled();
    const requests = mockFetch.mock.calls
      .map(([url]) => new URL(String(url)))
      .filter(
        (url) =>
          url.pathname === "/matches" &&
          url.searchParams.get("category") === category,
      );
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          search: expect.stringContaining(`clubId=${sportingId}`),
        }),
      ]),
    );
    expect(
      requests.some(
        (url) =>
          url.searchParams.get("seasonId") === sportingId &&
          url.searchParams.get("nextDay") === "2026-10-25" &&
          !!url.searchParams.get("timeZone"),
      ),
    ).toBe(true);
  }
  expect(screen).toHavePathname(clubPath);
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).endsWith(`/pools/${sportingId}/participants`),
    ),
  ).toBe(true);
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  expect(
    screen.queryByText(
      /Native store offer|Vérification.*Pro|expérience sans publicité/i,
    ),
  ).toBeNull();
}

it.each([
  "guest",
  "free",
  "paid",
  "gifted",
  "association-pending",
  "association-failed",
  "read-pending",
  "unknown",
  "expired",
  "revoked",
] as const)(
  "keeps maps and complete upcoming/completed club calendars public for %s",
  async (state) => {
    // Given
    if (state === "guest")
      mockAuth0.hasValidCredentials.mockResolvedValue(false);
    if (state === "paid" || state === "gifted")
      mockPurchases.getCustomerInfo.mockResolvedValue(
        rights(state === "paid" ? "APP_STORE" : "PROMOTIONAL"),
      );
    if (state === "association-pending")
      mockPurchases.isConfigured.mockReturnValue(new Promise(() => undefined));
    if (state === "association-failed")
      mockPurchases.isConfigured.mockRejectedValue(
        new Error("Native association unavailable"),
      );
    if (state === "read-pending")
      mockPurchases.getCustomerInfo.mockReturnValue(
        new Promise(() => undefined),
      );
    if (state === "unknown")
      mockPurchases.getCustomerInfo.mockRejectedValue(
        new Error("Native verification unavailable"),
      );
    if (state === "expired" || state === "revoked")
      mockPurchases.getCustomerInfo.mockResolvedValue(
        customerInfo({
          active: {},
          all: {
            "Blockout Pro": entitlement({
              isActive: false,
              store: state === "expired" ? "APP_STORE" : "PROMOTIONAL",
            }),
          },
          verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
        }),
      );
    await openInstallation();
    const status =
      state === "guest"
        ? "guest"
        : state === "paid" || state === "gifted"
          ? "active"
          : ["free", "expired", "revoked"].includes(state)
            ? "inactive"
            : "unavailable";
    await waitFor(() => expect(owners.pro.state.status).toBe(status));
    if (status === "unavailable") {
      const reason =
        state === "association-pending"
          ? "association-pending"
          : state === "association-failed"
            ? "association-failed"
            : "customer-info";
      await waitFor(() => expect(owners.pro.state).toMatchObject({ reason }));
    }

    // When
    await consultPublicSport();

    // Then
    if (status === "active" || status === "unavailable")
      expect(mockCreateAd).not.toHaveBeenCalled();
    else {
      await waitFor(() => expect(mockCreateAd).toHaveBeenCalled());
      expect(InterstitialAd.createForAdRequest).toHaveBeenCalledWith(
        "synthetic-unit",
        { requestNonPersonalizedAdsOnly: true },
      );
      mockCreateAd.mock.results.forEach((result) => {
        if (result.type === "return") {
          expect(result.value.load).toHaveBeenCalledTimes(1);
          expect(result.value.show).not.toHaveBeenCalled();
        }
      });
    }
  },
);

/** Selects the real map summary; navigation continues through F11's single sporting transition. */
async function selectMappedTeam() {
  await userEvent.press(screen.getByRole("tab", { name: "Carte" }));
  await fireEvent(
    await screen.findByRole("button", { name: "La Rochelle: Rives" }),
    "press",
    { stopPropagation: jest.fn() },
  );
  await screen.findByRole("link", { name: "Voir l’équipe" });
}

/** Completes actual voluntary sporting openings; back navigation creates no advertising opportunity. */
async function visitMappedTeam(times: number) {
  for (let index = 0; index < times; index++) {
    await userEvent.press(screen.getByRole("link", { name: "Voir l’équipe" }));
    await waitFor(() => expect(screen).toHavePathname(`/teams/${sportingId}`));
    await act(() => router.back());
    await waitFor(() => expect(screen).toHavePathname(poolPath));
  }
}

it("presents the single F11 interstitial on the tenth sporting opening and releases its actual destination once", async () => {
  // Given
  await openInstallation();
  await selectMappedTeam();
  await waitFor(() => expect(mockCreateAd).toHaveBeenCalledTimes(1));
  const ad = mockCreateAd.mock.results[0].value;
  expect(ad.load).toHaveBeenCalledTimes(1);
  await act(() => ad.emit(AdEventType.LOADED));

  // When
  await visitMappedTeam(9);

  // Then
  expect(ad.show).not.toHaveBeenCalled();
  expect(mockCreateAd).toHaveBeenCalledTimes(1);

  // When
  await userEvent.press(screen.getByRole("link", { name: "Voir l’équipe" }));

  // Then
  expect(ad.show).toHaveBeenCalledTimes(1);
  expect(screen).toHavePathname(poolPath);

  // When
  await act(() => {
    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.CLOSED);
    ad.emit(AdEventType.CLOSED);
  });

  // Then
  await waitFor(() => expect(screen).toHavePathname(`/teams/${sportingId}`));
  await act(() => router.back());
  expect(screen).toHavePathname(poolPath);
  expect(ad.show).toHaveBeenCalledTimes(1);
});

it.each(["APP_STORE", "PROMOTIONAL"] as const)(
  "retires prepared ads when current %s rights activate without accumulating Pro advertising debt",
  async (store) => {
    // Given
    await openInstallation();
    await selectMappedTeam();
    await waitFor(() => expect(mockCreateAd).toHaveBeenCalledTimes(1));
    const oldAd = mockCreateAd.mock.results[0].value;
    await act(() => oldAd.emit(AdEventType.LOADED));
    mockPurchases.getCustomerInfo.mockResolvedValue(rights(store));
    const signal =
      mockPurchases.addCustomerInfoUpdateListener.mock.calls.at(-1)?.[0];
    if (!signal) throw new Error("Expected native entitlement subscription");

    // When
    await act(() => signal(rights(store)));
    await waitFor(() => expect(owners.pro.state.status).toBe("active"));
    await visitMappedTeam(10);

    // Then
    expect(oldAd.destroy).toHaveBeenCalledTimes(1);
    expect(oldAd.load).toHaveBeenCalledTimes(1);
    expect(oldAd.show).not.toHaveBeenCalled();
    expect(mockCreateAd).toHaveBeenCalledTimes(1);
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();

    // When: SDK inactivity, rather than fixture date arithmetic, permits F11 eligibility again.
    const inactive = customerInfo({
      active: {},
      all: { "Blockout Pro": entitlement({ store, isActive: false }) },
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    });
    mockPurchases.getCustomerInfo.mockResolvedValue(inactive);
    await act(() => signal(inactive));
    await waitFor(() => expect(mockCreateAd).toHaveBeenCalledTimes(2));
    const currentAd = mockCreateAd.mock.results[1].value;
    await act(() => currentAd.emit(AdEventType.LOADED));
    await visitMappedTeam(1);

    // Then
    expect(currentAd.load).toHaveBeenCalledTimes(1);
    expect(currentAd.show).not.toHaveBeenCalled();
  },
);

it.each(["APP_STORE", "PROMOTIONAL"] as const)(
  "avoids age, consent, ATT and purchase prompts for known %s Pro while retaining F05/F12 permissions",
  async (store) => {
    // Given
    await AsyncStorage.removeItem("blockout:advertising-age");
    mockPurchases.getCustomerInfo.mockResolvedValue(rights(store));
    await openInstallation();
    await waitFor(() => expect(owners.pro.state.status).toBe("active"));

    // When
    await act(() => router.push("/"));
    await waitFor(() => expect(screen).toHavePathname("/"));
    expect(screen.queryByRole("adjustable")).toBeNull();
    await act(() => router.push("/profile"));

    // Then
    await screen.findByText("Original");
    expect(screen.queryByRole("header", { name: "Administration" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Supprimer mon compte" }),
    ).toBeEnabled();
    expect(mockCreateAd).not.toHaveBeenCalled();
    expect(nativeAdvertising.AdsConsent.gatherConsent).not.toHaveBeenCalled();
    expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
    expect(screen.queryByRole("adjustable")).toBeNull();

    // When
    await userEvent.press(screen.getByRole("button", { name: "Blockout Pro" }));

    // Then
    expect(
      await screen.findByText("Native purchase management"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Native store offer")).toBeNull();
  },
);

it("does not transfer a gifted exemption to the guest after actual F05 sign-out", async () => {
  // Given
  mockPurchases.getCustomerInfo.mockResolvedValue(rights("PROMOTIONAL"));
  await openInstallation();
  await waitFor(() => expect(owners.pro.state.status).toBe("active"));
  await act(() => router.push("/profile"));
  await screen.findByText("Original");

  // When
  await userEvent.press(screen.getByRole("button", { name: "Se déconnecter" }));
  await waitFor(() => expect(owners.session.status).toBe("guest"));
  await act(() => router.push(poolPath));
  await screen.findByRole("tab", { name: "Carte" });

  // Then
  expect(owners.pro.state.status).toBe("guest");
  await waitFor(() => expect(mockCreateAd).toHaveBeenCalled());
  const ad = mockCreateAd.mock.results[0].value;
  expect(ad.load).toHaveBeenCalledTimes(1);
  await selectMappedTeam();
  await act(() => ad.emit(AdEventType.LOADED));
  await visitMappedTeam(9);
  await userEvent.press(screen.getByRole("link", { name: "Voir l’équipe" }));
  expect(ad.show).toHaveBeenCalledTimes(1);
  await act(() => {
    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.CLOSED);
  });
  await waitFor(() => expect(screen).toHavePathname(`/teams/${sportingId}`));
  await act(() => router.back());
  await userEvent.press(screen.getByRole("button", { name: "Suivre" }));
  expect(
    await screen.findByRole("button", { name: "Se connecter" }),
  ).toBeOnTheScreen();
  expect(mockFetch.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(
    false,
  );
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
});

it.each(["inactive", "active"] as const)(
  "uses current F12 administration permission independently of %s Pro",
  async (status) => {
    // Given
    mockAccount.permissions.manageMaintenance = true;
    if (status === "active")
      mockPurchases.getCustomerInfo.mockResolvedValue(rights("APP_STORE"));
    await openInstallation();
    await waitFor(() => expect(owners.pro.state.status).toBe(status));

    // When
    await act(() => router.push("/profile"));

    // Then
    expect(
      await screen.findByRole("link", { name: "Maintenance" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("header", { name: "Administration" }),
    ).toBeOnTheScreen();
  },
);

it("keeps unknown signed-in rights out of advertising and repurchase in the real Pro destination", async () => {
  // Given
  mockPurchases.getCustomerInfo.mockRejectedValue(
    new Error("No current native state"),
  );
  await openInstallation();
  await waitFor(() => expect(owners.pro.state.status).toBe("unavailable"));

  // When
  await act(() => router.push("/profile"));
  await screen.findByText("Original");
  await userEvent.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Contacter l’assistance" }),
  ).toBeEnabled();
  expect(screen.queryByText("Native store offer")).toBeNull();
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  expect(mockCreateAd).not.toHaveBeenCalled();
});

it("keeps public consultation usable after an interrupted native purchase without reopening a paywall", async () => {
  // Given
  await openInstallation();
  await waitFor(() => expect(owners.pro.state.status).toBe("inactive"));
  await act(() => router.push("/profile"));
  await screen.findByText("Original");
  await userEvent.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native store offer");
  const resume = jest.fn();
  await act(() =>
    mockPaywall.onPurchasePackageInitiated?.({
      packageBeingPurchased: v2Offering.availablePackages[0],
      resume,
    }),
  );
  expect(resume).toHaveBeenCalledWith(true);

  // When
  await act(() => mockPaywall.onDismiss?.());
  await waitFor(() =>
    expect(owners.pro.state).toMatchObject({ operation: "uncertain" }),
  );
  mockPurchases.getOfferings.mockClear();
  await act(() => router.push(poolPath));
  await screen.findByRole("tab", { name: "Carte" });
  await consultPublicSport();

  // Then
  expect(owners.pro.state).toMatchObject({
    status: "inactive",
    operation: "uncertain",
  });
  await act(() => router.push("/profile"));
  await screen.findByText("Original");
  await userEvent.press(
    await screen.findByRole("button", { name: "Blockout Pro" }),
  );
  await waitFor(() => expect(screen).toHavePathname("/pro"));
  expect(
    await screen.findByText(/Le résultat de l’achat est incertain/),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Native store offer")).toBeNull();
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
});

it("keeps inactive sporting access public when native consent cannot authorize advertising", async () => {
  // Given
  jest
    .spyOn(nativeAdvertising.AdsConsent, "gatherConsent")
    .mockRejectedValue(new Error("Native consent unavailable"));
  await openInstallation();
  await waitFor(() => expect(owners.pro.state.status).toBe("inactive"));

  // When
  await consultPublicSport();

  // Then
  expect(nativeAdvertising.AdsConsent.gatherConsent).toHaveBeenCalled();
  expect(mockCreateAd).not.toHaveBeenCalled();
  expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
});
