import type { PropsWithChildren } from "react";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  getGetMyAccountQueryKey,
  getGetMatchQueryKey,
  getGetNotificationSummaryQueryKey,
  getListNotificationsQueryKey,
} from "../../../../.generated/mobile";
import type {
  AccountResponse,
  NotificationSummaryResponse,
  NotificationsResponse,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "@/shared/query/query-client";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "@/features/access/queries/use-application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "@/features/accounts/session/account-session-provider";
import { accountResponse } from "@/features/accounts/test-support/account-response";
import { mockAuth0 } from "@/features/accounts/test-support/native-auth0";
import { ProProvider, usePro } from "@/features/pro/pro-provider";
import * as proSessionModule from "@/features/pro/pro-session";
import { prepareProNativeIO } from "@/features/pro/test-support/pro-harness";
import { mockPurchases } from "@/features/pro/test-support/native-purchases";
import { useSupportSubmission } from "../api/use-support-submission";
import { supportContext, supportHref } from "../model/support-context";
import { supportMetadata } from "./fixtures";

// F05/F09, Query and the generated support consumer are real; native/provider I/O is controlled.
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { revenueCat: { iosApiKey: "test_public" } } },
  },
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("@/features/pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const environment = { ...process.env };
const targetId = "00000000-0000-4000-8000-000000000319";
const claimedAccountId = "00000000-0000-4000-8000-000000000999";
const acceptedId = "00000000-0000-4000-8000-000000000320";
const account = accountResponse();
let publicClient = createQueryClient();

beforeEach(() => {
  jest.useFakeTimers();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "support-boundaries-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "support-boundaries-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  publicClient = createQueryClient();
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  mockPurchases.restorePurchases.mockReset();
  mockFetch.mockReset().mockImplementation(async (url, options) => {
    const path = new URL(String(url)).pathname;
    if (path === "/application-access") {
      return Response.json(applicationAccessResponse());
    }
    if (path === "/accounts/me" && (options?.method ?? "GET") === "GET") {
      return Response.json(account);
    }
    if (path === "/support-requests" && options?.method === "POST") {
      return Response.json({ requestId: acceptedId }, { status: 201 });
    }
    throw new Error(`Unexpected ownership-boundary request: ${path}`);
  });
});

afterEach(async () => {
  await cleanup();
  publicClient.clear();
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  process.env = { ...environment };
});

/** Mounts the actual session, entitlement and admission owners around the support mutation. */
function Providers({ children }: Readonly<PropsWithChildren>) {
  return (
    <QueryClientProvider client={publicClient}>
      <ApplicationAccessProvider>
        <AccountSessionProvider>
          <ProProvider>{children}</ProProvider>
        </AccountSessionProvider>
      </ApplicationAccessProvider>
    </QueryClientProvider>
  );
}

it("carries a hidden target reference without acquiring its details or declared authority", () => {
  // Given: extra fields can arrive from an untrusted navigation object.
  const origin = {
    screen: "match",
    targetType: "match",
    targetId,
    targetName: "Private hidden match",
    accountId: claimedAccountId,
    replyEmail: "claimed-owner@example.invalid",
    repositoryAccess: true,
    manageSportingPresentation: true,
    pro: true,
  };

  // When
  const context = supportContext(origin);
  const href = supportHref(origin);

  // Then
  expect(context).toEqual({
    screen: "Match",
    action: "Consultation de la cible",
    target: { type: "match", id: targetId },
  });
  expect(href.params).toEqual({
    originScreen: "match",
    targetType: "match",
    targetId,
  });
  expect(mockFetch).not.toHaveBeenCalled();
});

it.each([
  {
    subject: "stream-links",
    description: "Signalez ce lien et masquez-le pour tout le monde.",
  },
  {
    subject: "sporting-data",
    description: "Je suis responsable du club ; accordez-moi la correction.",
  },
  {
    subject: "account",
    description: "Ce compte est le mien ; fusionnez-le puis supprimez-le.",
  },
  {
    subject: "pro-subscription",
    description: "Cet achat est le mien ; donnez Pro au compte déclaré.",
  },
] as const)(
  "accepts $subject declarations only as a support request while business owners retain their state",
  async ({ subject, description }) => {
    // Given
    const { result } = await renderHook(
      () => ({
        support: useSupportSubmission(),
        session: useAccountSession(),
        pro: usePro(),
        cache: useQueryClient(),
      }),
      { wrapper: Providers },
    );
    await waitFor(() =>
      expect(result.current.pro.state.status).toBe("inactive"),
    );
    const inboxKey = getListNotificationsQueryKey(account.accountId);
    const summaryKey = getGetNotificationSummaryQueryKey(account.accountId);
    const inbox: NotificationsResponse = { notifications: [] };
    const summary: NotificationSummaryResponse = { unreadCount: 0 };
    result.current.cache.setQueryData(inboxKey, inbox);
    result.current.cache.setQueryData(summaryKey, summary);
    const requestsBeforeSupport = mockFetch.mock.calls.length;
    const credentialsBeforeSupport = mockAuth0.getCredentials.mock.calls.length;
    const associationsBeforeSupport = mockPurchases.logIn.mock.calls.length;
    const metadata = {
      ...supportMetadata,
      subject,
      description,
      replyEmail: "claimed-owner@example.invalid",
      context: {
        ...supportContext({ screen: "match", targetType: "match", targetId }),
        accountId: claimedAccountId,
      },
    };

    // When
    await act(async () => result.current.support.send(metadata));

    // Then: every outbound operation is observed, including forbidden reads and writes.
    await waitFor(() =>
      expect(result.current.support.mutation.isSuccess).toBe(true),
    );
    const requests = mockFetch.mock.calls.slice(requestsBeforeSupport);
    expect(requests).toHaveLength(1);
    expect(new URL(String(requests[0][0])).pathname).toBe("/support-requests");
    expect(requests[0][1]?.method).toBe("POST");
    const body = requests[0][1]?.body as FormData;
    expect(JSON.parse(await (body.get("metadata") as Blob).text())).toEqual(
      metadata,
    );
    expect(result.current.session.accountId).toBe(account.accountId);
    expect(result.current.session.subject).toBe("auth0|synthetic");
    expect(
      result.current.cache.getQueryData<AccountResponse>(
        getGetMyAccountQueryKey(),
      ),
    ).toEqual(account);
    expect(result.current.pro.state).toEqual({
      status: "inactive",
      operation: "idle",
    });
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
    expect(mockPurchases.logIn).toHaveBeenCalledTimes(
      associationsBeforeSupport,
    );
    expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(
      credentialsBeforeSupport,
    );
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
    expect(result.current.cache.getQueryData(inboxKey)).toEqual(inbox);
    expect(result.current.cache.getQueryData(summaryKey)).toEqual(summary);
    expect(
      result.current.cache.getQueryData(getGetMatchQueryKey(targetId)),
    ).toBeUndefined();
  },
);
