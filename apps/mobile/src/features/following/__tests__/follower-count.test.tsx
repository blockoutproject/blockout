import {
  cleanup,
  act,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { useCurrentAccount } from "../../accounts/current-account";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  mockAuth0,
  credentialsFor,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { followingFixture } from "../test-support/following-fixture";
import { FollowerCount } from "../components/follower-count";
import { followerCountKey } from "../api/following-keys";

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
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: string, request?: RequestInit) => mockFetch(url, request),
}));
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
const team = {
  type: "team",
  id: "00000000-0000-4000-8000-000000000227",
} as const;
const pool = { type: "pool", id: team.id } as const;
const environment = { ...process.env };
let fixture: ReturnType<typeof followingFixture>;
/** Scenario-neutral generated transport; each test explicitly replaces decisive failures or counts. */
async function transport(url: string, request?: RequestInit) {
  if (url.endsWith("/application-access"))
    return Response.json(applicationAccessResponse());
  if (url.endsWith("/accounts/me")) return Response.json(accountResponse());
  if (url.endsWith("/follower-count")) return Response.json({ count: 2 });
  if (request?.method === "PUT")
    return Response.json(JSON.parse(String(request.body)));
  return Response.json({ following: false });
}
/** Exercises a separate mounted private consumer without making the public counter its owner. */
function PrivateProfile() {
  useCurrentAccount();
  return null;
}

beforeEach(() => {
  fixture = followingFixture();
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "test-client",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|demo"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(transport);
});
afterEach(async () => {
  await cleanup();
  fixture.dispose();
  process.env = { ...environment };
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it.each([team, pool])(
  "reads a public $type count while private profile retrieval fails",
  async (target) => {
    // Given
    mockFetch.mockImplementation((url, request) =>
      url.endsWith("/accounts/me")
        ? Promise.reject(new TypeError("private profile unavailable"))
        : transport(url, request),
    );
    await fixture.render(
      <>
        <PrivateProfile />
        <FollowerCount target={target} />
      </>,
    );

    // When / Then
    expect(await screen.findByLabelText("2 abonnés")).toBeOnTheScreen();
    const countRequest = mockFetch.mock.calls.find(([url]) =>
      url.endsWith(`/${target.type}s/${target.id}/follower-count`),
    );
    expect(new Headers(countRequest?.[1]?.headers).has("Authorization")).toBe(
      false,
    );
    expect(
      mockFetch.mock.calls.some(
        ([url]) =>
          url.includes("/team-follows/") || url.includes("/pool-follows/"),
      ),
    ).toBe(false);
  },
);

it("shows a real zero for a guest without resolving a private account", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  mockFetch.mockImplementation((url, request) =>
    url.endsWith("/follower-count")
      ? Promise.resolve(Response.json({ count: 0 }))
      : transport(url, request),
  );
  await fixture.render(<FollowerCount target={team} />);

  // When / Then
  expect(await screen.findByLabelText("0 abonné")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) => url.endsWith("/accounts/me")),
  ).toBe(false);
  expect(mockAuth0.getCredentials).not.toHaveBeenCalled();
});

it.each([{}, { count: -1 }, { count: 9007199254740992 }])(
  "does not invent zero after an invalid count response %j",
  async (body) => {
    // Given
    mockFetch.mockImplementation((url, request) =>
      url.endsWith("/follower-count")
        ? Promise.resolve(Response.json(body))
        : transport(url, request),
    );
    await fixture.render(<FollowerCount target={team} />);

    // When / Then
    expect(
      await screen.findByRole("button", {
        name: "Réessayer le nombre d’abonnés",
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText("0 abonné")).not.toBeOnTheScreen();
    expect(fixture.client.getQueryData(followerCountKey(team))).toBeUndefined();
  },
);

it("keeps an honest retained count after failed refresh and retries only this count", async () => {
  // Given
  const user = userEvent.setup();
  await fixture.render(<FollowerCount target={team} />);
  await screen.findByLabelText("2 abonnés");
  mockFetch.mockImplementation((url, request) =>
    url.endsWith("/follower-count")
      ? Promise.reject(new TypeError("count unavailable"))
      : transport(url, request),
  );

  // When
  await act(() =>
    fixture.client.invalidateQueries({
      queryKey: followerCountKey(team),
      exact: true,
    }),
  );

  // Then
  expect(
    await screen.findByLabelText("2 abonnés, actualisation indisponible"),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("0 abonné")).not.toBeOnTheScreen();

  // When
  mockFetch.mockImplementation((url, request) =>
    url.endsWith("/follower-count")
      ? Promise.resolve(Response.json({ count: 1 }))
      : transport(url, request),
  );
  await user.press(
    screen.getByRole("button", { name: "Réessayer le nombre d’abonnés" }),
  );

  // Then
  expect(await screen.findByLabelText("1 abonné")).toBeOnTheScreen();
});

it.each([403, 404])(
  "withdraws a retained count after current %s refusal",
  async (status) => {
    // Given
    await fixture.render(<FollowerCount target={team} />);
    await screen.findByLabelText("2 abonnés");
    mockFetch.mockImplementation((url, request) =>
      url.endsWith("/follower-count")
        ? Promise.resolve(new Response(null, { status }))
        : transport(url, request),
    );

    // When
    await act(() =>
      fixture.client.invalidateQueries({
        queryKey: followerCountKey(team),
        exact: true,
      }),
    );

    // Then
    await screen.findByRole("button", {
      name: "Réessayer le nombre d’abonnés",
    });
    expect(screen.queryByLabelText(/2 abonnés/)).not.toBeOnTheScreen();

    // When: a later network loss cannot restore a currently refused count.
    mockFetch.mockImplementation((url, request) =>
      url.endsWith("/follower-count")
        ? Promise.reject(new TypeError("later read unavailable"))
        : transport(url, request),
    );
    await act(() =>
      fixture.client.invalidateQueries({
        queryKey: followerCountKey(team),
        exact: true,
      }),
    );

    // Then
    expect(fixture.client.getQueryData(followerCountKey(team))).toBeUndefined();
    expect(screen.queryByLabelText(/2 abonnés/)).not.toBeOnTheScreen();
  },
);

it("isolates deliberate maintenance bypass from the anonymous public count", async () => {
  // Given
  let active = false;
  mockFetch.mockImplementation((url, request) => {
    if (url.endsWith("/application-access"))
      return Promise.resolve(
        Response.json({
          ...applicationAccessResponse(),
          maintenance: {
            revision: active ? 1 : 0,
            active,
            message: null,
            imageUrl: null,
          },
        }),
      );
    if (url.endsWith("/accounts/me")) {
      const profile = accountResponse();
      return Promise.resolve(
        Response.json({
          ...profile,
          permissions: { ...profile.permissions, bypassMaintenance: true },
        }),
      );
    }
    if (url.endsWith("/follower-count"))
      return Promise.resolve(Response.json({ count: active ? 3 : 2 }));
    return transport(url, request);
  });
  await fixture.render(
    <>
      <PrivateProfile />
      <FollowerCount target={team} />
    </>,
  );
  await screen.findByLabelText("2 abonnés");
  await waitFor(() =>
    expect(fixture.session.accountId).toBe(accountResponse().accountId),
  );
  await act(async () => {
    active = true;
    await fixture.admission.retry();
    fixture.admission.requestBypass(fixture.session, true);
  });

  // When / Then
  expect(await screen.findByLabelText("3 abonnés")).toBeOnTheScreen();
  const countRequests = mockFetch.mock.calls.filter(([url]) =>
    url.endsWith("/follower-count"),
  );
  expect(countRequests).toHaveLength(2);
  expect(new Headers(countRequests[0][1]?.headers).has("Authorization")).toBe(
    false,
  );
  expect(new Headers(countRequests[1][1]?.headers).has("Authorization")).toBe(
    true,
  );
  expect(
    new Headers(countRequests[1][1]?.headers).get(
      "Blockout-Maintenance-Bypass",
    ),
  ).toBe("true");
  expect(fixture.client.getQueryData(followerCountKey(team))).toEqual({
    count: 2,
  });
});
