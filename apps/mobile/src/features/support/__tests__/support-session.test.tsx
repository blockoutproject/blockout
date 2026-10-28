import {
  render,
  screen,
  userEvent,
  cleanup,
  waitFor,
} from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderRouter } from "expo-router/testing-library";
import { Pressable, Text } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { createQueryClient } from "../../../shared/query/query-client";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { SupportJourney } from "../screens/support-journey";
import { SupportForm } from "../forms/support-form";
import { SignInScreen } from "../../accounts/screens/sign-in-screen";
import { AccountAdmissionProvider } from "../../accounts/components/account-admission";
import SupportLayout from "../../../app/(ordinary)/support/_layout";
import SupportChoiceRoute from "../../../app/(ordinary)/support/choice";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";

jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  usePreventRemove: jest.fn(),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn();
const environment = { ...process.env };
let client = createQueryClient();

beforeEach(() => {
  client = createQueryClient();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "support-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "support-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth.mockReset();
  const payload = Buffer.from(
    JSON.stringify({ sub: "auth0|support239", email: "sdk@example.invalid" }),
  ).toString("base64url");
  mockAuth0.getCredentials.mockReset().mockResolvedValue({
    ...credentialsFor("auth0|support239"),
    idToken: `e30.${payload}.test-signature`,
  });
  mockFetch.mockReset().mockImplementation((url) => {
    if (String(url).endsWith("/application-access"))
      return Promise.resolve(Response.json(mockApplicationAccessResponse()));
    throw new Error(
      "Support preparation must not look up private data or send a ticket",
    );
  });
});
afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...environment };
});

/** Exercises the actual F05 invalidation operation, not an emulated form generation. */
function SessionAction() {
  const session = useAccountSession();
  return (
    <>
      <Text>{session.status}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Changer de génération"
        onPress={() => session.invalidate()}
      >
        <Text>Changer de génération</Text>
      </Pressable>
    </>
  );
}

/** Actual SDK/session/Query/form owners; only native credentials and HTTP are controlled. */
async function mountSupport(admitted = true) {
  const submit = jest.fn().mockRejectedValue(new Error("Unavailable"));
  await render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>
              <SessionAction />
              <SupportJourney
                admitted={admitted}
                origin={{
                  screen: "sign-in",
                  failureStage: "account-establishment",
                  failureReason: "unavailable",
                }}
              >
                <SupportForm onSubmit={submit} />
              </SupportJourney>
            </AccountFeedbackProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
  await screen.findByText("authenticated");
  return submit;
}

it("uses an editable SDK contact after failed establishment without acquiring more credentials", async () => {
  // Given
  const submit = await mountSupport();
  await screen.findByDisplayValue("sdk@example.invalid");
  const calls = mockAuth0.getCredentials.mock.calls.length;
  const user = userEvent.setup();

  // When
  await user.type(screen.getByLabelText("Titre"), "Compte inaccessible");
  await user.type(screen.getByLabelText("Description"), "La création échoue.");
  await user.clear(screen.getByLabelText("E-mail de réponse"));
  await user.type(
    screen.getByLabelText("E-mail de réponse"),
    "reply@example.invalid",
  );
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));

  // Then
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        replyEmail: "reply@example.invalid",
        context: expect.objectContaining({
          signInFailure: {
            method: "hosted",
            stage: "account-establishment",
            reason: "unavailable",
          },
        }),
      }),
    ),
  );
  expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(calls);
  expect(
    mockFetch.mock.calls.every(([url]) =>
      String(url).endsWith("/application-access"),
    ),
  ).toBe(true);
});

it("discards private input when the real F05 generation is invalidated", async () => {
  // Given
  await mountSupport();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Titre"), "Titre privé");
  await user.type(screen.getByLabelText("Description"), "Description privée");
  await user.clear(screen.getByLabelText("E-mail de réponse"));
  await user.type(
    screen.getByLabelText("E-mail de réponse"),
    "private@example.invalid",
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Changer de génération" }),
  );

  // Then
  await waitFor(() =>
    expect(screen.getByLabelText("Titre")).toHaveDisplayValue(""),
  );
  expect(screen.getByLabelText("Description")).toHaveDisplayValue("");
  expect(screen.queryByDisplayValue("private@example.invalid")).toBeNull();
});

it("does not mount the private form outside ordinary admission", async () => {
  // Given / When
  await mountSupport(false);

  // Then
  expect(screen.queryByLabelText("Titre")).toBeNull();
});

it.each(["authentication", "account-establishment"] as const)(
  "retains the actual %s failure through the existing sign-in support entry",
  async (stage) => {
    // Given: real SDK/F05/Router/form owners, with failures only at native authentication or HTTP.
    mockAuth0.hasValidCredentials.mockResolvedValue(false);
    process.env.EXPO_PUBLIC_AUTH0_AUDIENCE = "support-test";
    if (stage === "authentication")
      mockAuth0.webAuth.mockRejectedValue(
        new Error("Synthetic provider failure"),
      );
    else {
      mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|support239"));
      mockFetch.mockImplementation((url) =>
        String(url).endsWith("/application-access")
          ? Promise.resolve(Response.json(mockApplicationAccessResponse()))
          : Promise.resolve(
              Response.json(
                { type: "urn:blockout:problem:unavailable", status: 503 },
                { status: 503 },
              ),
            ),
      );
    }
    const submit = jest.fn().mockRejectedValue(new Error("Unavailable"));
    await renderRouter(
      {
        index: () => <SignInScreen admitted />,
        "support/_layout": SupportLayout,
        "support/choice": SupportChoiceRoute,
        "support/index": () => <SupportForm onSubmit={submit} />,
      },
      {
        initialUrl: "/",
        wrapper: ({ children }) => (
          <ThemeProvider>
            <QueryClientProvider client={client}>
              <ApplicationAccessProvider>
                <AccountSessionProvider>
                  <AccountFeedbackProvider>
                    <AccountAdmissionProvider admitted>
                      {children}
                    </AccountAdmissionProvider>
                  </AccountFeedbackProvider>
                </AccountSessionProvider>
              </ApplicationAccessProvider>
            </QueryClientProvider>
          </ThemeProvider>
        ),
      },
    );
    const user = userEvent.setup();
    await user.press(
      await screen.findByRole("button", { name: "Se connecter" }),
    );
    await screen.findByText(TECHNICAL_ERROR);
    expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
    const calls = mockAuth0.getCredentials.mock.calls.length;

    // When
    await user.press(screen.getByRole("link", { name: "Besoin d’aide ?" }));
    await user.type(
      await screen.findByLabelText("Titre"),
      "Connexion impossible",
    );
    await user.type(
      screen.getByLabelText("Description"),
      "Échec de démonstration",
    );
    await user.clear(screen.getByLabelText("E-mail de réponse"));
    await user.type(
      screen.getByLabelText("E-mail de réponse"),
      "contact@example.invalid",
    );
    await user.press(
      screen.getByRole("button", { name: "Nature de la demande" }),
    );
    await user.press(
      await screen.findByRole("radio", { name: "Suggérer une amélioration" }),
    );
    await user.press(
      screen.getByRole("button", { name: "Sujet (facultatif)" }),
    );
    await user.press(await screen.findByRole("radio", { name: "Sans sujet" }));
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );

    // Then
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "suggestion",
          context: expect.objectContaining({
            screen: "Connexion",
            signInFailure: { method: "hosted", stage, reason: "unavailable" },
          }),
        }),
      ),
    );
    expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(calls);
    expect(submit.mock.calls[0][0]).not.toHaveProperty("subject");
  },
);
