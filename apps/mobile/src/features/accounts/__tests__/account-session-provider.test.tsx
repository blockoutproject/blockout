import {
  act,
  render,
  renderHook,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { useState, type ComponentProps } from "react";
import { Pressable, Text, TextInput } from "react-native";
import { useAuth0, type Credentials } from "react-native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";

jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
// Keep the SDK's React provider, reducer and hooks real; only native I/O is controlled.
jest.mock(require.resolve("react-native-auth0/src/Auth0.ts"), () => ({
  __esModule: true,
  default: jest.fn(() => mockClient),
}));
jest.mock("react-native-auth0", () => {
  const sdk = jest.requireActual<typeof import("react-native-auth0")>(
    "react-native-auth0/src/hooks/Auth0Provider.tsx",
  );
  return {
    __esModule: true,
    default: jest.requireMock(
      require.resolve("react-native-auth0/src/Auth0.ts"),
    ).default,
    useAuth0: jest.requireActual("react-native-auth0/src/hooks/useAuth0.ts")
      .useAuth0,
    Auth0Provider: ({
      children,
      ...options
    }: ComponentProps<typeof sdk.Auth0Provider>) => (
      <sdk.Auth0Provider {...options}>
        <MockNativeAuthenticationControls />
        {children}
      </sdk.Auth0Provider>
    ),
  };
});

const mockClient = {
  credentialsManager: {
    hasValidCredentials: jest.fn<Promise<boolean>, []>(),
    getCredentials: jest.fn<Promise<Credentials>, []>(),
    clearCredentials: jest.fn<Promise<void>, []>(),
    saveCredentials: jest.fn<Promise<void>, [Credentials]>(),
  },
  webAuth: { authorize: jest.fn<Promise<Credentials>, []>() },
};

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

/** Supplies decoded identity claims to the SDK; this fixture does not qualify token validation. */
function credentialsFor(subject: string): Credentials {
  const payload = Buffer.from(JSON.stringify({ sub: subject })).toString(
    "base64url",
  );
  return {
    accessToken: "test-access-token",
    idToken: `e30.${payload}.test-signature`,
    tokenType: "Bearer",
    expiresAt: 2_000_000_000,
  };
}

/** Drives the real SDK's public actions inside its provider, independently of application navigation. */
function MockNativeAuthenticationControls() {
  const auth = useAuth0();
  return (
    <>
      <Text>Native identity: {auth.user?.sub ?? "guest"}</Text>
      {auth.error && <Text>Native error: {auth.error.message}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Native sign in"
        onPress={() => void auth.authorize()}
      >
        <Text>Sign in</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Clear native credentials"
        onPress={() => void auth.clearCredentials()}
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

it("preserves public editing while initialization waits and when Auth0 becomes available", async () => {
  // Given
  const initialization = Promise.withResolvers<void>();
  jest.mocked(initializeV2Installation).mockReturnValue(initialization.promise);
  const user = userEvent.setup();
  await render(
    <AccountSessionProvider>
      <SessionConsumer />
    </AccountSessionProvider>,
  );
  expect(screen.getByText("Authentication: initializing")).toBeOnTheScreen();
  expect(
    mockClient.credentialsManager.hasValidCredentials,
  ).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Public draft"), "Paris");

  // When
  await act(async () => initialization.resolve());

  // Then
  expect(screen.getByText("Authentication: guest")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Paris")).toBeOnTheScreen();
  expect(mockClient.credentialsManager.hasValidCredentials).toHaveBeenCalled();
});

it("preserves public editing after initialization failure and explicit retry", async () => {
  // Given
  jest
    .mocked(initializeV2Installation)
    .mockRejectedValueOnce(new Error("Storage unavailable"));
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
  expect(screen.getByText("Authentication: guest")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Paris")).toBeOnTheScreen();
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

it.each(["success", "failure"] as const)(
  "discards a late credential %s without changing the cleared SDK session",
  async (completion) => {
    // Given
    mockClient.credentialsManager.hasValidCredentials.mockResolvedValue(true);
    const hook = await renderHook(useAccountSession, {
      wrapper: AccountSessionProvider,
    });
    const renewal = Promise.withResolvers<Credentials>();
    mockClient.credentialsManager.getCredentials.mockReturnValueOnce(
      renewal.promise,
    );
    const captured = hook.result.current.generation;
    const pending = hook.result.current.getCredentials(captured);
    const outcome = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    const user = userEvent.setup();

    // When
    await user.press(
      screen.getByRole("button", { name: "Clear native credentials" }),
    );
    expect(hook.result.current.status).toBe("guest");
    await act(async () => {
      if (completion === "failure")
        renewal.reject(new Error("Old network failure"));
      else renewal.resolve(credentialsFor("auth0|a"));
      await outcome;
    });

    // Then
    expect(hook.result.current.status).toBe("guest");
    expect(hook.result.current.error).toBeNull();
    expect(screen.getByText("Native identity: guest")).toBeOnTheScreen();
    expect(
      screen.queryByText("Native error: Old network failure"),
    ).not.toBeOnTheScreen();
    expect(hook.result.current.isCurrent(captured)).toBe(false);

    // When
    mockClient.credentialsManager.getCredentials.mockClear();
    await expect(
      hook.result.current.getCredentials(captured),
    ).rejects.toMatchObject({ name: "AbortError" });

    // Then
    expect(mockClient.credentialsManager.getCredentials).not.toHaveBeenCalled();
  },
);

it("preserves the account context when native credential retrieval fails transiently", async () => {
  // Given
  mockClient.credentialsManager.hasValidCredentials.mockResolvedValue(true);
  const hook = await renderHook(useAccountSession, {
    wrapper: AccountSessionProvider,
  });
  const failure = new Error("Network unavailable");
  mockClient.credentialsManager.getCredentials.mockRejectedValueOnce(failure);
  const captured = hook.result.current.generation;
  await act(async () => {
    hook.result.current.setAccount(captured, "account-a");
  });

  // When
  await expect(hook.result.current.getCredentials(captured)).rejects.toBe(
    failure,
  );

  // Then
  expect(hook.result.current.status).toBe("authenticated");
  expect(hook.result.current.accountId).toBe("account-a");
  expect(hook.result.current.generation).toBe(captured);
});

it("returns native credentials without inferring a business account", async () => {
  // Given
  mockClient.credentialsManager.hasValidCredentials.mockResolvedValue(true);
  const hook = await renderHook(useAccountSession, {
    wrapper: AccountSessionProvider,
  });
  const credentials = credentialsFor("auth0|a");
  mockClient.credentialsManager.getCredentials.mockResolvedValueOnce(
    credentials,
  );
  const captured = hook.result.current.generation;

  // When
  const result = await hook.result.current.getCredentials(captured);

  // Then
  expect(result).toBe(credentials);
  expect(hook.result.current.generation).toBe(captured);
  expect(hook.result.current.accountId).toBeNull();
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
