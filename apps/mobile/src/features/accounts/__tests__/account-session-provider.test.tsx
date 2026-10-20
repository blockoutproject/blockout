import {
  act,
  render,
  renderHook,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text, TextInput } from "react-native";
import { useAuth0, type Credentials } from "react-native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";
import { credentialsFor, mockClient } from "../test-support/native-auth0";

jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
// Keep the SDK's React provider, reducer and hooks real; only native I/O is controlled.
jest.mock(require.resolve("react-native-auth0/src/Auth0.ts"), () => ({
  __esModule: true,
  default: jest.fn(() => mockClient),
}));
jest.mock("react-native-auth0", () =>
  jest.requireActual("../test-support/native-auth0").nativeAuth0Module(),
);

const originalConfiguration = {
  EXPO_PUBLIC_AUTH0_DOMAIN: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
  EXPO_PUBLIC_AUTH0_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
};

beforeEach(() => {
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockClient.credentialsManager.hasValidCredentials
    .mockReset()
    .mockResolvedValue(false);
  mockClient.credentialsManager.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|a"));
  mockClient.credentialsManager.clearCredentials
    .mockReset()
    .mockResolvedValue();
  mockClient.credentialsManager.saveCredentials.mockReset().mockResolvedValue();
  mockClient.webAuth.authorize
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|a"));
});

afterEach(() => {
  jest.restoreAllMocks();
  for (const [key, value] of Object.entries(originalConfiguration)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

/** Exercises native actions from an ordinary app descendant, invalidating old work before logout. */
function MockNativeAuthenticationControls() {
  const auth = useAuth0();
  const session = useAccountSession();
  return (
    <>
      <Text>Native identity: {auth.user?.sub ?? "guest"}</Text>
      {auth.error && <Text>Native error: {auth.error.message}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Native sign in"
        onPress={() => {
          session.invalidate();
          void auth.authorize();
        }}
      >
        <Text>Sign in</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Clear native credentials"
        onPress={() => void session.clearCredentials()}
      >
        <Text>Clear credentials</Text>
      </Pressable>
    </>
  );
}

/** Exercises session availability alongside public local state that must survive authentication changes. */
function SessionConsumer({ work }: { work?: Promise<string> }) {
  const session = useAccountSession();
  const [draft, setDraft] = useState("");
  return (
    <>
      <MockNativeAuthenticationControls />
      <Text>Public content</Text>
      <TextInput
        accessibilityLabel="Public draft"
        value={draft}
        onChangeText={setDraft}
      />
      <Text>Authentication: {session.status}</Text>
      {session.error instanceof Error && (
        <Text>Error: {session.error.message}</Text>
      )}
      <Text>Account: {session.accountId ?? "unavailable"}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry initialization"
        onPress={session.retryInitialization}
      >
        <Text>Retry</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Establish account"
        onPress={() => session.setAccount(session.generation, "account-a")}
      >
        <Text>Establish</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start account read"
        onPress={() => {
          const captured = session.generation;
          void work?.then((accountId) =>
            session.setAccount(captured, accountId),
          );
        }}
      >
        <Text>Read</Text>
      </Pressable>
    </>
  );
}

it("finishes local initialization before mounting application consumers or restoring credentials", async () => {
  // Given
  const initialization = Promise.withResolvers<void>();
  jest.mocked(initializeV2Installation).mockReturnValue(initialization.promise);
  await render(
    <AccountSessionProvider>
      <SessionConsumer />
    </AccountSessionProvider>,
  );
  expect(screen.queryByText("Public content")).not.toBeOnTheScreen();
  expect(
    mockClient.credentialsManager.hasValidCredentials,
  ).not.toHaveBeenCalled();

  // When
  await act(async () => initialization.resolve());

  // Then
  expect(screen.getByText("Public content")).toBeOnTheScreen();
  expect(screen.getByText("Authentication: guest")).toBeOnTheScreen();
  expect(mockClient.credentialsManager.hasValidCredentials).toHaveBeenCalled();
});

it("retains guest access after initialization failures and replaces that navigation on successful retry", async () => {
  // Given
  jest
    .mocked(initializeV2Installation)
    .mockRejectedValueOnce(new Error("Storage unavailable"))
    .mockRejectedValueOnce(new Error("Storage still unavailable"));
  const user = userEvent.setup();
  await render(
    <AccountSessionProvider>
      <SessionConsumer />
    </AccountSessionProvider>,
  );
  expect(
    screen.getByText("Authentication: initialization-error"),
  ).toBeOnTheScreen();
  expect(
    mockClient.credentialsManager.hasValidCredentials,
  ).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Public draft"), "Paris");

  // When
  await user.press(
    screen.getByRole("button", { name: "Retry initialization" }),
  );

  // Then
  expect(
    screen.getByText("Error: Storage still unavailable"),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Paris")).toBeOnTheScreen();
  expect(
    mockClient.credentialsManager.hasValidCredentials,
  ).not.toHaveBeenCalled();

  // When
  await user.press(
    screen.getByRole("button", { name: "Retry initialization" }),
  );

  // Then
  expect(screen.getByText("Authentication: guest")).toBeOnTheScreen();
  expect(screen.getByText("Public content")).toBeOnTheScreen();
  expect(screen.getByLabelText("Public draft")).toHaveDisplayValue("");
});

it("distinguishes native restoration and authenticated identity from an unavailable business account", async () => {
  // Given
  const restoration = Promise.withResolvers<Credentials>();
  mockClient.credentialsManager.hasValidCredentials.mockResolvedValue(true);
  mockClient.credentialsManager.getCredentials.mockReturnValueOnce(
    restoration.promise,
  );
  await render(
    <AccountSessionProvider>
      <SessionConsumer />
    </AccountSessionProvider>,
  );
  expect(screen.getByText("Authentication: restoring")).toBeOnTheScreen();

  // When
  await act(async () => restoration.resolve(credentialsFor("auth0|a")));

  // Then
  expect(screen.getByText("Authentication: authenticated")).toBeOnTheScreen();
  expect(screen.getByText("Account: unavailable")).toBeOnTheScreen();
});

it.each(["auth0|a", "auth0|b"])(
  "preserves public editing and discards an old account read across A to guest to %s",
  async (nextSubject) => {
    // Given
    mockClient.credentialsManager.hasValidCredentials.mockResolvedValue(true);
    const work = Promise.withResolvers<string>();
    const user = userEvent.setup();
    await render(
      <AccountSessionProvider>
        <SessionConsumer work={work.promise} />
      </AccountSessionProvider>,
    );
    await user.type(screen.getByLabelText("Public draft"), "Paris");
    await user.press(screen.getByRole("button", { name: "Establish account" }));
    await user.press(
      screen.getByRole("button", { name: "Start account read" }),
    );

    // When
    await user.press(
      screen.getByRole("button", { name: "Clear native credentials" }),
    );
    expect(screen.getByText("Authentication: guest")).toBeOnTheScreen();
    expect(screen.getByText("Account: unavailable")).toBeOnTheScreen();
    mockClient.webAuth.authorize.mockResolvedValueOnce(
      credentialsFor(nextSubject),
    );
    await user.press(screen.getByRole("button", { name: "Native sign in" }));
    await act(async () => work.resolve("account-a"));

    // Then
    expect(
      screen.getByText(`Native identity: ${nextSubject}`),
    ).toBeOnTheScreen();
    expect(screen.getByText("Authentication: authenticated")).toBeOnTheScreen();
    expect(screen.getByText("Account: unavailable")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Paris")).toBeOnTheScreen();
  },
);

it("preserves the account context when native credential retrieval fails transiently", async () => {
  // Given
  mockClient.credentialsManager.hasValidCredentials.mockResolvedValue(true);
  const hook = await renderHook(
    () => ({ auth: useAuth0(), session: useAccountSession() }),
    { wrapper: AccountSessionProvider },
  );
  const failure = new Error("Network unavailable");
  mockClient.credentialsManager.getCredentials.mockRejectedValueOnce(failure);
  const captured = hook.result.current.session.generation;
  await act(async () => {
    hook.result.current.session.setAccount(captured, "account-a");
  });

  // When
  await act(async () => {
    await expect(hook.result.current.auth.getCredentials()).rejects.toBe(
      failure,
    );
  });

  // Then
  expect(hook.result.current.session.status).toBe("authenticated");
  expect(hook.result.current.session.accountId).toBe("account-a");
  expect(hook.result.current.session.generation).toBe(captured);
});

it("returns native credentials without inferring a business account", async () => {
  // Given
  mockClient.credentialsManager.hasValidCredentials.mockResolvedValue(true);
  const hook = await renderHook(
    () => ({ auth: useAuth0(), session: useAccountSession() }),
    { wrapper: AccountSessionProvider },
  );
  const credentials = credentialsFor("auth0|a");
  mockClient.credentialsManager.getCredentials.mockResolvedValueOnce(
    credentials,
  );
  const captured = hook.result.current.session.generation;

  // When
  let result: Credentials | undefined;
  await act(async () => {
    result = await hook.result.current.auth.getCredentials();
  });

  // Then
  expect(result).toBe(credentials);
  expect(hook.result.current.session.generation).toBe(captured);
  expect(hook.result.current.session.accountId).toBeNull();
});

it("leaves public access available when native authentication is not configured", async () => {
  // Given
  delete process.env.EXPO_PUBLIC_AUTH0_DOMAIN;

  // When
  await render(
    <AccountSessionProvider>
      <SessionConsumer />
    </AccountSessionProvider>,
  );

  // Then
  expect(screen.getByText("Public content")).toBeOnTheScreen();
  expect(
    screen.getByText("Authentication: initialization-error"),
  ).toBeOnTheScreen();
  expect(
    mockClient.credentialsManager.hasValidCredentials,
  ).not.toHaveBeenCalled();
  expect(initializeV2Installation).not.toHaveBeenCalled();
});

it("exposes the SDK context to ordinary app descendants", async () => {
  // Given
  mockClient.credentialsManager.hasValidCredentials.mockResolvedValue(true);

  // When
  const hook = await renderHook(
    () => ({ auth: useAuth0(), session: useAccountSession() }),
    {
      wrapper: AccountSessionProvider,
    },
  );

  // Then
  expect(hook.result.current.auth.user?.sub).toBe("auth0|a");
  expect(hook.result.current.session.status).toBe("authenticated");
});

it("retries SDK restoration explicitly after a network failure without clearing credentials or logging in", async () => {
  // Given
  mockClient.credentialsManager.hasValidCredentials.mockResolvedValue(true);
  mockClient.credentialsManager.getCredentials.mockRejectedValueOnce(
    new Error("Network unavailable"),
  );
  const hook = await renderHook(
    () => ({ auth: useAuth0(), session: useAccountSession() }),
    {
      wrapper: AccountSessionProvider,
    },
  );
  expect(hook.result.current.session.status).toBe("authentication-error");
  const previousSession = hook.result.current.session;

  // When
  await act(async () => previousSession.retryAuthentication());

  // Then
  expect(hook.result.current.session.status).toBe("authenticated");
  expect(hook.result.current.auth.user?.sub).toBe("auth0|a");
  expect(hook.result.current.session.error).toBeNull();
  expect(previousSession.isCurrent(previousSession.generation)).toBe(false);
  expect(mockClient.credentialsManager.clearCredentials).not.toHaveBeenCalled();
  expect(mockClient.webAuth.authorize).not.toHaveBeenCalled();
  expect(initializeV2Installation).toHaveBeenCalledTimes(1);
});

it("leaves a second restoration failure visible until another explicit retry", async () => {
  // Given
  mockClient.credentialsManager.hasValidCredentials.mockResolvedValue(true);
  mockClient.credentialsManager.getCredentials.mockRejectedValue(
    new Error("Network unavailable"),
  );
  const hook = await renderHook(useAccountSession, {
    wrapper: AccountSessionProvider,
  });

  // When
  await act(async () => hook.result.current.retryAuthentication());

  // Then
  expect(hook.result.current.status).toBe("authentication-error");
  expect(mockClient.credentialsManager.getCredentials).toHaveBeenCalledTimes(2);
  expect(mockClient.credentialsManager.clearCredentials).not.toHaveBeenCalled();
  expect(mockClient.webAuth.authorize).not.toHaveBeenCalled();
});

it("invalidates private work immediately even when native credential clearing is still pending", async () => {
  // Given
  mockClient.credentialsManager.hasValidCredentials.mockResolvedValue(true);
  const hook = await renderHook(useAccountSession, {
    wrapper: AccountSessionProvider,
  });
  const captured = hook.result.current.generation;
  await act(async () => {
    hook.result.current.setAccount(captured, "account-a");
  });
  const clearing = Promise.withResolvers<void>();
  mockClient.credentialsManager.clearCredentials.mockReturnValueOnce(
    clearing.promise,
  );

  // When
  let completion: Promise<void>;
  await act(async () => {
    completion = hook.result.current.clearCredentials();
  });

  // Then
  expect(hook.result.current.isCurrent(captured)).toBe(false);
  expect(hook.result.current.accountId).toBeNull();
  expect(hook.result.current.setAccount(captured, "late-account")).toBe(false);

  // When
  await act(async () => {
    clearing.resolve();
    await completion;
  });

  // Then
  expect(hook.result.current.status).toBe("guest");
});
