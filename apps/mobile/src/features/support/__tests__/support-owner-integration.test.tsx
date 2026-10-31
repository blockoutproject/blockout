import type { ComponentType } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import RootLayout from "../../../app/_layout";
import AccessRoute from "../../../app/access";
import NotFoundRoute from "../../../app/+not-found";
import OnboardingRoute from "../../../app/onboarding";
import OperationsLayout from "../../../app/(operations)/_layout";
import AdministrationRoute from "../../../app/(operations)/administration";
import ProfileRoute from "../../../app/(ordinary)/(tabs)/profile/index";
import SignInRoute from "../../../app/(ordinary)/sign-in";
import MatchRoute from "../../../app/(ordinary)/matches/[matchId]";
import SupportLayout from "../../../app/(ordinary)/support/_layout";
import SupportRoute from "../../../app/(ordinary)/support/index";
import SupportChoiceRoute from "../../../app/(ordinary)/support/choice";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";
import type { SubmitSupportRequest } from "../../../../.generated/schemas/index.zod";

// Root, F14 initialization, Auth0 JS, F05/Query, F12 guards, RHF and generated transport are real.
// Only native SDK/storage/manifest/rendering and Fetch I/O are controlled.
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("expo-application", () => ({ nativeApplicationVersion: "2.9.0" }));
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
          router: { sitemap: false },
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
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../pro/test-support/native-purchases")
    .mockPurchases,
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
const supportHttp = jest.fn<Promise<Response>, [RequestInit?]>();
const accountHttp = jest.fn<Promise<Response>, []>();
const accessHttp = jest.fn<Promise<Response>, []>();
const environment = { ...process.env };
const targetId = "00000000-0000-4000-8000-000000000298";
let access = applicationAccessResponse();
let account = accountResponse();

beforeEach(async () => {
  jest.useFakeTimers();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "support-owner-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "support-owner-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  await AsyncStorage.clear();
  await AsyncStorage.multiSet([
    ["blockout:v2-initialized", "true"],
    ["blockout:v2-discovery-complete", "true"],
  ]);
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|A"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth.mockReset();
  access = applicationAccessResponse();
  account = accountResponse();
  accessHttp.mockReset().mockImplementation(async () => Response.json(access));
  accountHttp
    .mockReset()
    .mockImplementation(async () => Response.json(account));
  supportHttp
    .mockReset()
    .mockResolvedValue(Response.json({ requestId: targetId }, { status: 201 }));
  mockFetch.mockReset().mockImplementation(async (url, options) => {
    const path = new URL(String(url)).pathname;
    if (path === "/application-access") return accessHttp();
    if (path === "/accounts/me") return accountHttp();
    if (path === "/support-requests") return supportHttp(options);
    if (path === `/matches/${targetId}`)
      return Response.json({}, { status: 404 });
    throw new Error(`Unexpected test destination: ${path}`);
  });
});
afterEach(async () => {
  await cleanup();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  process.env = { ...environment };
});

/** Mounts production root guards and the actual affected destinations; unrelated routes are inert. */
async function openRoute(path: string) {
  const view = await renderRouter(
    {
      _layout: () => <RootLayout />,
      access: AccessRoute,
      "+not-found": NotFoundRoute,
      onboarding: OnboardingRoute,
      "age-declaration": () => null,
      "(ordinary)/_layout": () => <Stack />,
      "(ordinary)/index": () => <Text>Ordinary home</Text>,
      "(ordinary)/profile": ProfileRoute,
      "(ordinary)/sign-in": SignInRoute,
      "(ordinary)/matches/[matchId]": MatchRoute,
      "(ordinary)/support/_layout": SupportLayout,
      "(ordinary)/support/index": SupportRoute,
      "(ordinary)/support/choice": SupportChoiceRoute,
      "(operations)/_layout": OperationsLayout,
      "(operations)/administration/index": AdministrationRoute,
      "(operations)/administration/maintenance": () => null,
      "(operations)/administration/application-versions": () => null,
      "(operations)/administration/classification/[kind]/[id]": () => null,
      "(operations)/administration/classification-selection": () => null,
      "(operations)/administration/divisions/index": () => null,
      "(operations)/administration/divisions/[id]": () => null,
      "(operations)/administration/divisions/new": () => null,
      "(operations)/administration/presentation/[kind]/[id]": () => null,
      "(operations)/collection": () => null,
    },
    { initialUrl: path },
  );
  // Complete native Query read recovery, including account 503 and unavailable cold-start checks.
  await act(async () => jest.advanceTimersByTimeAsync(8_000));
  return view;
}

/** Fills actual user-editable fields; the scenario chooses classification and explicitly sends. */
async function fillForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Titre"), "Demande fictive");
  await user.type(
    screen.getByLabelText("Description"),
    "Je déclare le compte de Camille et un achat, sans preuve.",
  );
  await user.clear(screen.getByLabelText("E-mail de réponse"));
  await user.type(
    screen.getByLabelText("E-mail de réponse"),
    "declared@example.invalid",
  );
  return user;
}

/** Reads metadata from the generated client's native multipart part, without a substitute serializer. */
async function sentMetadata(): Promise<SubmitSupportRequest> {
  const body = supportHttp.mock.calls[0][0]?.body as FormData;
  return JSON.parse(await (body.get("metadata") as Blob).text());
}

it.each(["guest", "signed-in", "profile-unavailable"])(
  "keeps the Profile help entry and ordinary sending available to %s without acquiring action credentials",
  async (identity) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(identity !== "guest");
    if (identity === "profile-unavailable")
      accountHttp.mockResolvedValue(Response.json({}, { status: 503 }));
    await openRoute("/profile");
    if (identity === "profile-unavailable")
      expect(
        screen.getByRole("alert", { name: "Une erreur est survenue" }),
      ).toBeOnTheScreen();
    else if (identity === "signed-in")
      expect(await screen.findByText(account.username)).toBeOnTheScreen();
    const credentialsBeforeSupport = mockAuth0.getCredentials.mock.calls.length;
    const requestsBeforeSupport = mockFetch.mock.calls.length;
    const user = userEvent.setup();

    // When
    await user.press(screen.getByRole("button", { name: "Besoin d’aide ?" }));
    await screen.findByLabelText("Titre");
    expect(screen.getByLabelText("E-mail de réponse")).toHaveDisplayValue(
      identity === "signed-in" ? account.email : "",
    );
    await fillForm();
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );

    // Then
    await screen.findByRole("header", { name: "Demande reçue" });
    expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(
      credentialsBeforeSupport,
    );
    const headers = new Headers(supportHttp.mock.calls[0][0]?.headers);
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.has("Blockout-Maintenance-Bypass")).toBe(false);
    expect(
      mockFetch.mock.calls
        .slice(requestsBeforeSupport)
        .map(([url]) => new URL(String(url)).pathname),
    ).toEqual(["/support-requests"]);
    expect(await sentMetadata()).toMatchObject({
      kind: "problem",
      replyEmail: "declared@example.invalid",
      context: { screen: "Profil" },
    });
    expect((await sentMetadata()).context.accountId).toBe(
      identity === "signed-in" ? account.accountId : undefined,
    );
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();
    expect(mockAuth0.saveCredentials).not.toHaveBeenCalled();
  },
);

it("sends a suggestion after actual hosted sign-in failure with only safe failure metadata", async () => {
  // Given
  mockAuth0.webAuth.mockRejectedValue(
    new Error(
      "password=synthetic-secret token=synthetic-token raw-provider-output",
    ),
  );
  await openRoute("/sign-in");
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Se connecter" }));
  await screen.findByText(TECHNICAL_ERROR);
  const credentialsBeforeSupport = mockAuth0.getCredentials.mock.calls.length;

  // When
  await user.press(screen.getByRole("link", { name: "Besoin d’aide ?" }));
  await screen.findByLabelText("Titre");
  await fillForm();
  await user.press(
    screen.getByRole("button", { name: "Nature de la demande" }),
  );
  await user.press(
    await screen.findByRole("radio", { name: "Suggérer une amélioration" }),
  );
  expect(
    screen.getByText("Décrivez votre besoin et l’amélioration souhaitée."),
  ).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Sujet (facultatif)" }));
  await user.press(await screen.findByRole("radio", { name: "Sans sujet" }));
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));

  // Then
  await screen.findByRole("header", { name: "Demande reçue" });
  const metadata = await sentMetadata();
  expect(metadata.kind).toBe("suggestion");
  expect(metadata).not.toHaveProperty("subject");
  expect(metadata.context).toMatchObject({
    screen: "Connexion",
    action: "Connexion",
    signInFailure: {
      method: "hosted",
      stage: "authentication",
      reason: "unavailable",
    },
  });
  expect(JSON.stringify(metadata)).not.toMatch(
    /synthetic-secret|synthetic-token|raw-provider-output/,
  );
  expect(metadata.context).not.toHaveProperty("accountId");
  expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(
    credentialsBeforeSupport,
  );
  expect(
    new Headers(supportHttp.mock.calls[0][0]?.headers).has("Authorization"),
  ).toBe(false);
  expect(
    mockFetch.mock.calls.every(
      ([, options]) =>
        options?.method === "GET" ||
        (options?.method === "POST" && options?.body instanceof FormData),
    ),
  ).toBe(true);
});

it("retains the inaccessible match UUID and editable sporting subject without inventing target details", async () => {
  // Given
  await openRoute(`/matches/${targetId}`);
  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.example.invalid/matches/${targetId}`,
      expect.anything(),
    ),
  );
  await act(async () => jest.advanceTimersByTimeAsync(8_000));
  await screen.findByRole("alert", { name: "Une erreur est survenue" });
  const user = userEvent.setup();

  // When
  await user.press(
    screen.getByRole("button", { name: "Signaler un problème" }),
  );
  await screen.findByLabelText("Titre");
  expect(
    screen.getByRole("button", { name: "Sujet (facultatif)" }),
  ).toHaveAccessibilityValue({ text: "données sportives" });
  await user.press(screen.getByRole("button", { name: "Sujet (facultatif)" }));
  await user.press(await screen.findByRole("radio", { name: "autre" }));
  await fillForm();
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));

  // Then
  await screen.findByRole("header", { name: "Demande reçue" });
  const metadata = await sentMetadata();
  expect(metadata.subject).toBe("other");
  expect(metadata.context).toEqual({
    screen: "Match",
    action: "Consultation de la cible",
    target: { type: "match", id: targetId },
    platform: "ios",
    appVersion: "2.9.0",
  });
  expect(mockAuth0.getCredentials).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method !== "GET"),
  ).toHaveLength(1);
});

it.each(["problem", "suggestion"])(
  "refuses missing, blank and invalid required fields in the actual %s form",
  async (kind) => {
    // Given
    await openRoute("/support");
    const user = userEvent.setup();
    if (kind === "suggestion") {
      await user.press(
        screen.getByRole("button", { name: "Nature de la demande" }),
      );
      await user.press(
        await screen.findByRole("radio", { name: "Suggérer une amélioration" }),
      );
    }

    // When
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );

    // Then
    expect(await screen.findByText("Indiquez un titre.")).toBeOnTheScreen();
    expect(screen.getByText("Décrivez votre demande.")).toBeOnTheScreen();
    expect(
      screen.getByText("Indiquez une adresse e-mail de réponse."),
    ).toBeOnTheScreen();

    // When
    await user.type(screen.getByLabelText("Titre"), "   ");
    await user.type(screen.getByLabelText("Description"), "   ");
    await user.type(screen.getByLabelText("E-mail de réponse"), "invalid");
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );

    // Then
    expect(
      await screen.findByText("Indiquez une adresse e-mail valide."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Indiquez un titre.")).toBeOnTheScreen();
    expect(screen.getByText("Décrivez votre demande.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Titre")).toHaveDisplayValue("   ");
    expect(screen.getByLabelText("Description")).toHaveDisplayValue("   ");
    expect(supportHttp).not.toHaveBeenCalled();
    expect(mockAuth0.getCredentials).not.toHaveBeenCalled();
  },
);

it.each([
  { label: "Titre", value: "🏐".repeat(100), error: "Le titre est trop long." },
  {
    label: "Description",
    value: "🏐".repeat(5000),
    error: "La description est trop longue.",
  },
  {
    label: "E-mail de réponse",
    value: `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`,
    error: "L’adresse e-mail est trop longue.",
  },
])(
  "retains over-limit $label and accepts its exact UTF-16 limit after correction",
  async ({ label, value, error }) => {
    // Given
    await openRoute("/support");
    const user = await fillForm();
    await user.clear(screen.getByLabelText(label));
    // Paste is a supported native user interaction and keeps the long boundary input legible here.
    await user.paste(screen.getByLabelText(label), `${value}x`);

    // When
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );

    // Then
    expect(await screen.findByText(error)).toBeOnTheScreen();
    expect(screen.getByLabelText(label)).toHaveDisplayValue(`${value}x`);
    expect(supportHttp).not.toHaveBeenCalled();

    // When
    await user.clear(screen.getByLabelText(label));
    await user.paste(screen.getByLabelText(label), value);
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );

    // Then
    await screen.findByRole("header", { name: "Demande reçue" });
    const metadata = await sentMetadata();
    expect([
      metadata.title,
      metadata.description,
      metadata.replyEmail,
    ]).toContain(value);
  },
);

it("treats guest contact and account declarations as content, without identity or permission effects", async () => {
  // Given: untrusted URL declarations cannot establish an account or a target name.
  await openRoute(
    `/support?originScreen=pro&accountId=${targetId}&name=Camille&targetName=Invented&token=synthetic-token`,
  );
  const user = await fillForm();

  // When
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));

  // Then
  await screen.findByRole("header", { name: "Demande reçue" });
  const metadata = await sentMetadata();
  expect(metadata).toMatchObject({
    subject: "pro-subscription",
    replyEmail: "declared@example.invalid",
    description: "Je déclare le compte de Camille et un achat, sans preuve.",
  });
  expect(metadata.context).toEqual({
    screen: "Pro",
    platform: "ios",
    appVersion: "2.9.0",
  });
  expect(accountHttp).not.toHaveBeenCalled();
  expect(mockAuth0.getCredentials).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(mockAuth0.saveCredentials).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.map(([url]) => new URL(String(url)).pathname),
  ).toEqual(["/application-access", "/support-requests"]);
});

it.each(["maintenance", "mandatory-update", "access-unavailable"])(
  "keeps entries and direct form/choice routes behind %s even for an operator",
  async (gate) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    account.permissions = { manageMaintenance: true, bypassMaintenance: true };
    if (gate === "maintenance")
      access.maintenance = {
        revision: 1,
        active: true,
        message: "Maintenance",
        imageUrl: null,
      };
    if (gate === "mandatory-update")
      access.versions.ios = {
        minimumVersion: "2.10.0",
        storeUrl: "https://apps.apple.com/app/id123",
      };
    if (gate === "access-unavailable")
      accessHttp.mockResolvedValue(Response.json({}, { status: 503 }));

    // When
    await openRoute("/support?originScreen=profile");

    // Then
    expect(screen).toHavePathname("/access");
    if (gate === "access-unavailable")
      expect(
        screen.getByRole("alert", { name: "Une erreur est survenue" }),
      ).toBeOnTheScreen();
    else
      expect(
        screen.getByRole("header", {
          name:
            gate === "maintenance"
              ? "Blockout est en maintenance"
              : "Mets Blockout à jour.",
        }),
      ).toBeOnTheScreen();
    expect(screen.queryByLabelText("Titre")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Besoin d’aide ?" }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "Besoin d’aide ?" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Signaler un problème" }),
    ).toBeNull();

    // When
    await act(() => router.push("/support/choice?field=kind"));
    expect(screen).toHavePathname("/access");
    expect(
      screen.queryByRole("radio", { name: "Suggérer une amélioration" }),
    ).toBeNull();
    await act(() => router.push("/profile"));

    // Then
    expect(screen).toHavePathname("/access");
    expect(screen.queryByLabelText("Titre")).toBeNull();
    expect(
      screen.queryByRole("radio", { name: "Suggérer une amélioration" }),
    ).toBeNull();
    expect(supportHttp).not.toHaveBeenCalled();
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  },
);

/** Enters F12's actual administration route and requests personal bypass through its visible action. */
async function chooseBypass() {
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );
  await user.press(
    await screen.findByRole("button", {
      name: "Accéder à l’application pendant la maintenance",
    }),
  );
  await screen.findByText("Ordinary home");
  await act(() => router.push("/support"));
  await screen.findByLabelText("Titre");
  return user;
}

it("uses existing credentials and the shared header only after explicitly choosing personal bypass", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  account.permissions = { bypassMaintenance: true };
  access.maintenance = {
    revision: 1,
    active: true,
    message: "Maintenance",
    imageUrl: null,
  };
  await openRoute("/support");
  const user = await chooseBypass();
  const credentialsBeforeSend = mockAuth0.getCredentials.mock.calls.length;
  await fillForm();

  // When
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));

  // Then
  await screen.findByRole("header", { name: "Demande reçue" });
  expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(
    credentialsBeforeSend + 1,
  );
  const headers = new Headers(supportHttp.mock.calls[0][0]?.headers);
  expect(headers.get("Authorization")).toBe("Bearer test-access-token");
  expect(headers.get("Blockout-Maintenance-Bypass")).toBe("true");
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(access.maintenance.active).toBe(true);
});

it.each([401, 403])(
  "drops personal bypass after the server refuses its current credentials/grant (%i)",
  async (status) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    account.permissions = { bypassMaintenance: true };
    access.maintenance = {
      revision: 1,
      active: true,
      message: "Maintenance",
      imageUrl: null,
    };
    supportHttp.mockResolvedValue(Response.json({}, { status }));
    await openRoute("/support");
    const user = await chooseBypass();
    await fillForm();

    // When
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );

    // Then
    await screen.findByRole("header", { name: "Blockout est en maintenance" });
    expect(screen.queryByLabelText("Titre")).toBeNull();
    expect(screen.queryByText("Demande reçue")).toBeNull();
    expect(supportHttp).toHaveBeenCalledTimes(1);
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();
    await act(() => router.push("/support"));
    expect(screen).toHavePathname("/access");
  },
);

it.each(["NO_CREDENTIALS", "NO_REFRESH_TOKEN"])(
  "refuses bypass sending when the native manager reports %s",
  async (code) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    account.permissions = { bypassMaintenance: true };
    access.maintenance = {
      revision: 1,
      active: true,
      message: "Maintenance",
      imageUrl: null,
    };
    await openRoute("/support");
    const user = await chooseBypass();
    await fillForm();
    mockAuth0.getCredentials.mockRejectedValue({
      name: "CredentialsManagerError",
      code,
      message: "Synthetic credential refusal",
    });

    // When
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );

    // Then
    await screen.findByRole("header", { name: "Blockout est en maintenance" });
    expect(supportHttp).not.toHaveBeenCalled();
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  },
);

it.each(["grant-withdrawal", "mandatory-update"])(
  "removes an already bypassed support form after %s",
  async (restriction) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    account.permissions = { bypassMaintenance: true };
    access.maintenance = {
      revision: 1,
      active: true,
      message: "Maintenance",
      imageUrl: null,
    };
    await openRoute("/support");
    await chooseBypass();
    await fillForm();
    if (restriction === "grant-withdrawal") account = accountResponse();
    else
      access.versions.ios = {
        minimumVersion: "2.10.0",
        storeUrl: "https://apps.apple.com/app/id123",
      };

    // When: native Query focus recovery reads the current owners, without injecting their context.
    await act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    // Then: maintenance still presents first, and the form/direct route cannot retain admission.
    await screen.findByRole("header", { name: "Blockout est en maintenance" });
    await act(() => router.push("/support"));
    expect(screen).toHavePathname("/access");
    expect(screen.queryByLabelText("Titre")).toBeNull();
    expect(supportHttp).not.toHaveBeenCalled();
  },
);
