import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import * as WebBrowser from "expo-web-browser";
import type { ComponentType } from "react";
import { Text } from "react-native";
import RootLayout from "@/app/_layout";
import OrdinaryLayout from "@/app/(ordinary)/_layout";
import RecoveryLayout from "@/app/(recovery)/_layout";
import { AccessGateScreen } from "@/features/access/screens/access-gate-screen";
import {
  ProfileLegalLinks,
  PublicAccountLinks,
} from "@/features/accounts/components/public-account-links";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { accountResponse as mockAccountResponse } from "@/features/accounts/test-support/account-response";
import { submitAgeDeclaration } from "@/features/advertising/age-declaration";
import { completeDiscovery } from "@/features/onboarding/discovery-state";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import { usePro } from "@/features/pro";
import {
  customerInfo,
  entitlement,
} from "@/features/pro/test-support/customer-info";
import { prepareProNativeIO } from "@/features/pro/test-support/pro-harness";
import { mockPurchases } from "@/features/pro/test-support/native-purchases";
import * as proSessionModule from "@/features/pro/pro-session";
import { applicationAccessResponse as mockApplicationAccessResponse } from "@/shared/api/test-support/application-access";

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserResultType: {
    CANCEL: "cancel",
    DISMISS: "dismiss",
    OPENED: "opened",
    LOCKED: "locked",
  },
}));
jest.mock("expo-application", () => ({ nativeApplicationVersion: "2.9.0" }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        revenueCat: { iosApiKey: "test_public", androidApiKey: "test_public" },
      },
    },
  },
}));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("@/features/pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("expo/fetch", () => ({
  fetch: async (url: RequestInfo | URL) => {
    if (!String(url).endsWith("/application-access")) {
      return Response.json(mockAccountResponse());
    }
    if (mockGate === "unavailable") {
      throw new Error("Synthetic public access outage");
    }
    const response = mockApplicationAccessResponse();
    if (mockGate === "maintenance") {
      response.maintenance.active = true;
      response.maintenance.message = "Maintenance de démonstration.";
    }
    if (mockGate === "update") {
      response.versions.ios = {
        minimumVersion: "2.10.0",
        storeUrl: "https://apps.apple.com/app/id123",
      };
    }
    return Response.json(response);
  },
}));

const environment = { ...process.env };
let mockGate: "maintenance" | "update" | "unavailable" | undefined;

beforeEach(async () => {
  mockGate = undefined;
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  mockAuth0.webAuth.mockReset();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  await AsyncStorage.clear();
  await completeDiscovery();
  await submitAgeDeclaration(18, new Date());
  jest.mocked(initializeV2Installation).mockResolvedValue();
  jest.mocked(WebBrowser.openBrowserAsync).mockReset().mockResolvedValue({
    type: WebBrowser.WebBrowserResultType.CANCEL,
  });
});
afterEach(async () => {
  await cleanup();
  for (const key of [
    "EXPO_PUBLIC_AUTH0_DOMAIN",
    "EXPO_PUBLIC_AUTH0_CLIENT_ID",
    "EXPO_PUBLIC_AUTH0_AUDIENCE",
    "EXPO_PUBLIC_API_URL",
  ]) {
    if (environment[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = environment[key];
    }
  }
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Keeps real root/session/admission owners around the existing account entries; unrelated routes have no content. */
async function mountJourney(initialUrl = "/profile") {
  await renderRouter(
    {
      _layout: () => <RootLayout />,
      onboarding: () => null,
      "age-declaration": () => null,
      "(operations)/_layout": () => <Stack />,
      "(ordinary)/_layout": OrdinaryLayout,
      "(recovery)/_layout": RecoveryLayout,
      "(ordinary)/(tabs)/_layout": () => <Stack />,
      "(ordinary)/(tabs)/index": () => null,
      "(ordinary)/(tabs)/profile": ProfileEntries,
      "(recovery)/sign-in": PublicAccountLinks,
      "(ordinary)/privacy": () => null,
      "(ordinary)/privacy-age": () => null,
      "(ordinary)/pro": () => null,
      "(ordinary)/sign-in-invitation": () => null,
      access: AccessGateScreen,
    },
    { initialUrl },
  );
}

/** Reveals only F09's public status alongside the actual legal entries, without replacing provider behavior. */
function ProfileEntries() {
  const pro = usePro();
  return (
    <>
      <Text>Membership: {pro.state.status}</Text>
      <ProfileLegalLinks />
    </>
  );
}

describe.each([
  ["guest", false],
  ["active Pro", true],
] as const)("legal reading for %s", (_status, activePro) => {
  it.each([
    ["Mentions légales", "imprint"],
    ["Conditions d’utilisation", "terms"],
    ["Politique de confidentialité", "privacy"],
  ])(
    "opens %s without creating acceptance or changing the caller",
    async (label, kind) => {
      // Given: the real F09 owner receives active SDK evidence only in the Pro scenario.
      if (activePro) {
        mockAuth0.hasValidCredentials.mockResolvedValue(true);
        mockAuth0.getCredentials.mockResolvedValue(
          credentialsFor("auth0|legal-pro"),
        );
        const right = entitlement();
        const native = customerInfo({
          active: { "Blockout Pro": right },
          all: { "Blockout Pro": right },
          verification: right.verification,
        });
        mockPurchases.getCustomerInfo.mockResolvedValue(native);
        mockPurchases.logIn.mockResolvedValue({
          customerInfo: native,
          created: false,
        });
      }
      await mountJourney();
      await screen.findByText(`Membership: ${activePro ? "active" : "guest"}`);
      const storedBefore = await AsyncStorage.multiGet(
        await AsyncStorage.getAllKeys(),
      );
      const credentialsBefore = mockAuth0.getCredentials.mock.calls.length;

      // When
      await userEvent.setup().press(screen.getByRole("link", { name: label }));

      // Then: native return supplies no document screen, sign-in or stored acceptance.
      await waitFor(() =>
        expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
          `https://api.example.invalid/legals/${kind}`,
        ),
      );
      expect(screen).toHavePathname("/profile");
      expect(
        await AsyncStorage.multiGet(await AsyncStorage.getAllKeys()),
      ).toEqual(storedBefore);
      expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(credentialsBefore);
      expect(mockAuth0.webAuth).not.toHaveBeenCalled();
      expect(screen.queryByText(/accepté|consentement enregistré/i)).toBeNull();
    },
  );
});

it.each([
  ["Conditions d’utilisation", "terms"],
  ["Politique de confidentialité", "privacy"],
])(
  "opens the existing public %s footer before sign-in",
  async (label, kind) => {
    // Given
    await mountJourney("/sign-in");
    const user = userEvent.setup();

    // When
    await user.press(await screen.findByRole("link", { name: label }));

    // Then
    await waitFor(() =>
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        `https://api.example.invalid/legals/${kind}`,
      ),
    );
    expect(screen).toHavePathname("/sign-in");
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  },
);

it("shows safe opening failure and retries only when the existing link is pressed again", async () => {
  // Given
  jest
    .mocked(WebBrowser.openBrowserAsync)
    .mockRejectedValueOnce(new Error("Private native payload"));
  await mountJourney();
  const user = userEvent.setup();

  // When
  await user.press(
    await screen.findByRole("link", { name: "Mentions légales" }),
  );

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Impossible d’ouvrir ce document. Réessayez.",
  );
  expect(screen.queryByText("Private native payload")).toBeNull();
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledTimes(1);
  expect(screen).toHavePathname("/profile");

  // When
  await user.press(screen.getByRole("link", { name: "Mentions légales" }));

  // Then
  await waitFor(() =>
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledTimes(2),
  );
  expect(screen.queryByRole("alert")).toBeNull();
});

describe.each(["maintenance", "update", "unavailable"] as const)(
  "F12 %s gate",
  (gate) => {
    it.each(["/profile", "/sign-in"])(
      "blocks direct %s legal entry and navigation bypass",
      async (path) => {
        // Given
        mockGate = gate;
        if (gate === "unavailable") {
          jest.useFakeTimers();
        }

        // When
        await mountJourney(path);
        if (gate === "unavailable") {
          await act(async () => jest.advanceTimersByTimeAsync(8_000));
          await screen.findByRole("alert", { name: "Une erreur est survenue" });
        } else {
          await screen.findByRole("header", {
            name:
              gate === "maintenance"
                ? "Blockout est en maintenance"
                : "Mets Blockout à jour.",
          });
        }
        await act(async () =>
          router.push(path === "/profile" ? "/sign-in" : "/profile"),
        );

        // Then: public standalone URLs remain a backend concern; no in-app handoff can bypass admission.
        expect(
          screen.queryByRole("link", { name: "Mentions légales" }),
        ).toBeNull();
        expect(
          screen.queryByRole("link", { name: "Conditions d’utilisation" }),
        ).toBeNull();
        expect(
          screen.queryByRole("link", { name: "Politique de confidentialité" }),
        ).toBeNull();
        expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
        expect(mockAuth0.webAuth).not.toHaveBeenCalled();
        expect(screen).toHavePathname("/access");
      },
    );
  },
);
