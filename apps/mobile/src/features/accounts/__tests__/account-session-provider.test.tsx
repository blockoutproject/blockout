import {
  act,
  render,
  renderHook,
  screen,
  userEvent,
} from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { Pressable, Text } from "react-native";
import {
  Auth0Provider,
  type AuthError,
  type Credentials,
  type User,
} from "react-native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";

jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => ({
  __esModule: true,
  default: jest.fn(),
  Auth0Provider: jest.fn(({ children }: PropsWithChildren) => children),
  useAuth0: () => mockAuthentication,
}));

const mockAuthentication = {
  user: null as User | null,
  isLoading: false,
  error: null as AuthError | null,
  getCredentials: jest.fn<Promise<Credentials | undefined>, []>(),
};

const originalConfiguration = {
  EXPO_PUBLIC_AUTH0_DOMAIN: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
  EXPO_PUBLIC_AUTH0_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
};

beforeEach(() => {
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockAuthentication.user = null;
  mockAuthentication.isLoading = false;
  mockAuthentication.error = null;
  mockAuthentication.getCredentials.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
  for (const [key, value] of Object.entries(originalConfiguration)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

/** Exercises the public session boundary while the native SDK and initializer are controlled. */
function SessionConsumer({ work }: { work?: Promise<string> }) {
  const session = useAccountSession();
  return (
    <>
      <Text>Public content</Text>
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

it("keeps public access and Auth0 unmounted until initialization succeeds", async () => {
  // Given
  const initialization = Promise.withResolvers<void>();
  jest.mocked(initializeV2Installation).mockReturnValue(initialization.promise);

  // When
  await render(
    <AccountSessionProvider>
      <SessionConsumer />
    </AccountSessionProvider>,
  );

  // Then
  expect(screen.getByText("Public content")).toBeOnTheScreen();
  expect(screen.getByText("Authentication: initializing")).toBeOnTheScreen();
  expect(Auth0Provider).not.toHaveBeenCalled();

  // When
  await act(async () => initialization.resolve());

  // Then
  expect(screen.getByText("Authentication: guest")).toBeOnTheScreen();
  expect(Auth0Provider).toHaveBeenCalled();
});

it("keeps public access after initialization failure and mounts Auth0 only after explicit retry", async () => {
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
  expect(screen.getByText("Public content")).toBeOnTheScreen();
  expect(Auth0Provider).not.toHaveBeenCalled();

  // When
  await user.press(
    screen.getByRole("button", { name: "Retry initialization" }),
  );

  // Then
  expect(screen.getByText("Authentication: guest")).toBeOnTheScreen();
  expect(Auth0Provider).toHaveBeenCalled();
});

it("distinguishes native restoration and authenticated identity from an unavailable business account", async () => {
  // Given
  mockAuthentication.isLoading = true;
  const root = await render(
    <AccountSessionProvider>
      <SessionConsumer />
    </AccountSessionProvider>,
  );
  expect(screen.getByText("Authentication: restoring")).toBeOnTheScreen();

  // When
  mockAuthentication.isLoading = false;
  mockAuthentication.user = { sub: "auth0|a" };
  await root.rerender(
    <AccountSessionProvider>
      <SessionConsumer />
    </AccountSessionProvider>,
  );

  // Then
  expect(screen.getByText("Authentication: authenticated")).toBeOnTheScreen();
  expect(screen.getByText("Account: unavailable")).toBeOnTheScreen();
});

it("cannot admit an old account read after A to guest to A", async () => {
  // Given
  mockAuthentication.user = { sub: "auth0|a" };
  const work = Promise.withResolvers<string>();
  const user = userEvent.setup();
  const root = await render(
    <AccountSessionProvider>
      <SessionConsumer work={work.promise} />
    </AccountSessionProvider>,
  );
  await user.press(screen.getByRole("button", { name: "Establish account" }));
  await user.press(screen.getByRole("button", { name: "Start account read" }));

  // When
  mockAuthentication.user = null;
  await root.rerender(
    <AccountSessionProvider>
      <SessionConsumer work={work.promise} />
    </AccountSessionProvider>,
  );
  expect(screen.getByText("Account: unavailable")).toBeOnTheScreen();
  mockAuthentication.user = { sub: "auth0|a" };
  await root.rerender(
    <AccountSessionProvider>
      <SessionConsumer work={work.promise} />
    </AccountSessionProvider>,
  );
  await act(async () => work.resolve("account-a"));

  // Then
  expect(screen.getByText("Authentication: authenticated")).toBeOnTheScreen();
  expect(screen.getByText("Account: unavailable")).toBeOnTheScreen();
});

it.each(["success", "failure"] as const)(
  "discards a credential %s after a lifecycle boundary",
  async (completion) => {
    // Given
    mockAuthentication.user = { sub: "auth0|a" };
    const renewal = Promise.withResolvers<Credentials>();
    mockAuthentication.getCredentials.mockReturnValue(renewal.promise);
    const hook = await renderHook(useAccountSession, {
      wrapper: AccountSessionProvider,
    });
    const captured = hook.result.current.generation;
    const pending = hook.result.current.getCredentials(captured);
    const outcome = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });

    // When
    mockAuthentication.user = null;
    await hook.rerender(undefined);
    await act(async () => {
      if (completion === "failure")
        renewal.reject(new Error("Old network failure"));
      else
        renewal.resolve({
          accessToken: "old-test-token",
          idToken: "test-id-token",
          tokenType: "Bearer",
          expiresAt: 2_000_000_000,
        });
      await outcome;
    });

    // Then
    expect(mockAuthentication.getCredentials).toHaveBeenCalledTimes(1);
    await expect(
      hook.result.current.getCredentials(captured),
    ).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(mockAuthentication.getCredentials).toHaveBeenCalledTimes(1);
  },
);

it("preserves the account context when ordinary SDK credential retrieval fails transiently", async () => {
  // Given
  mockAuthentication.user = { sub: "auth0|a" };
  const failure: AuthError = Object.assign(new Error("Network unavailable"), {
    status: 0,
    code: "network_error",
    json: null,
  });
  mockAuthentication.getCredentials.mockRejectedValue(failure);
  const hook = await renderHook(useAccountSession, {
    wrapper: AccountSessionProvider,
  });
  const captured = hook.result.current.generation;
  await act(async () => {
    hook.result.current.setAccount(captured, "account-a");
  });

  // When
  await expect(hook.result.current.getCredentials(captured)).rejects.toBe(
    failure,
  );
  mockAuthentication.error = failure;
  await hook.rerender(undefined);

  // Then
  expect(hook.result.current.status).toBe("authenticated");
  expect(hook.result.current.accountId).toBe("account-a");
  expect(hook.result.current.generation).toBe(captured);
  expect(hook.result.current.error).toBe(failure);
});

it("returns ordinary SDK credentials without inferring a business account", async () => {
  // Given
  mockAuthentication.user = { sub: "auth0|a" };
  const credentials: Credentials = {
    accessToken: "current-test-token",
    idToken: "test-id-token",
    tokenType: "Bearer",
    expiresAt: 2_000_000_000,
  };
  mockAuthentication.getCredentials.mockResolvedValue(credentials);
  const hook = await renderHook(useAccountSession, {
    wrapper: AccountSessionProvider,
  });
  const captured = hook.result.current.generation;

  // When
  const result = await hook.result.current.getCredentials(captured);

  // Then
  expect(result).toBe(credentials);
  expect(mockAuthentication.getCredentials).toHaveBeenCalledWith();
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
  expect(Auth0Provider).not.toHaveBeenCalled();
  expect(initializeV2Installation).not.toHaveBeenCalled();
});
