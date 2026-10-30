import {
  MutationObserver,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../../features/accounts/session/account-session-provider";
import { initializeV2Installation } from "../../../features/onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../../features/accounts/test-support/native-auth0";
import { accountResponse } from "../../../features/accounts/test-support/account-response";
import { createQueryClient } from "../query-client";
import type { PropsWithChildren } from "react";

jest.mock("../../../features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../../features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo/fetch", () => ({
  fetch: async () =>
    Response.json(
      jest
        .requireActual(
          "../../../features/accounts/test-support/account-response",
        )
        .accountResponse(),
    ),
}));
const env = { ...process.env };
let publicClient = createQueryClient();
beforeEach(() => {
  jest.useFakeTimers();
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  publicClient = createQueryClient();
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|a"));
  mockAuth0.webAuth.mockReset().mockResolvedValue(credentialsFor("auth0|b"));
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
});
afterEach(async () => {
  await cleanup();
  publicClient.clear();
  // Await pending Query batches before restoring the test's real timer environment.
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
  process.env = { ...env };
});
/** The process public cache is deliberately outside the real identity-owned private cache. */
function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={publicClient}>
      <AccountSessionProvider>{children}</AccountSessionProvider>
    </QueryClientProvider>
  );
}

it("keeps A's detached mutation and private data out of B's new cache while retaining public startup", async () => {
  // Given
  publicClient.setQueryData(["public-startup"], { admitted: true });
  const hook = await renderHook(
    () => ({ session: useAccountSession(), client: useQueryClient() }),
    { wrapper: Providers },
  );
  await waitFor(() =>
    expect(hook.result.current.session.accountId).toBe(
      accountResponse().accountId,
    ),
  );
  const oldClient = hook.result.current.client;
  oldClient.setQueryData(["private-profile"], { username: "Alice" });
  const response = Promise.withResolvers<string>();
  const command = new MutationObserver(oldClient, {
    mutationFn: () => response.promise,
    onSuccess: (username) => {
      oldClient.setQueryData(["private-profile"], { username });
    },
  });
  const completion = command.mutate();
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|b"));
  // When
  await act(async () => {
    await hook.result.current.session.signIn("https://api.example.invalid");
  });
  await waitFor(() =>
    expect(hook.result.current.session.subject).toBe("auth0|b"),
  );
  await act(async () => {
    response.resolve("Late Alice");
    await completion;
  });
  // Then
  expect(hook.result.current.client).not.toBe(oldClient);
  expect(
    hook.result.current.client.getQueryData(["private-profile"]),
  ).toBeUndefined();
  expect(publicClient.getQueryData(["public-startup"])).toEqual({
    admitted: true,
  });
  expect(oldClient.getQueryData(["private-profile"])).toEqual({
    username: "Late Alice",
  });
  oldClient.clear();
});
