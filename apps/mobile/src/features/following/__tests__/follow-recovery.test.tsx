import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  mockAuth0,
  credentialsFor,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { followingFixture } from "../test-support/following-fixture";
import { FollowerCount } from "../components/follower-count";
import { SportingActions } from "../../sporting/components/sporting-actions";
import { followStateKey } from "../api/following-keys";
import { bindSessionQueries } from "../../../shared/query/query-client";

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
const season = {
  id: "00000000-0000-4000-8000-000000000003",
  label: "2026/2027",
  startYear: 2026,
};
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
  fixture.client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it("observes once while a delayed original write can still complete later", async () => {
  // Given
  let saved = false;
  let writes = 0;
  mockFetch.mockImplementation((url, request) => {
    if (request?.method === "PUT") {
      writes++;
      return Promise.reject(new TypeError("response lost"));
    }
    if (url.includes("/team-follows/"))
      return Promise.resolve(Response.json({ following: saved }));
    return transport(url, request);
  });
  const user = userEvent.setup();
  await fixture.render(<SportingActions target={team} season={season} />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Suivre" }));
  await waitFor(() => expect(fixture.client.isMutating()).toBe(0));
  saved = true; // The server records the original write after the bounded observation.

  // Then
  expect(
    screen.getByRole("button", {
      name: "Suivre",
      selected: false,
      busy: false,
    }),
  ).toBeEnabled();
  expect(writes).toBe(1);
  expect(
    mockFetch.mock.calls.filter(
      ([url, request]) =>
        url.includes("/team-follows/") && request?.method !== "PUT",
    ),
  ).toHaveLength(2);
  expect(screen.queryByText(/annulé|confirmé/)).not.toBeOnTheScreen();
});

it("preserves confirmed state when actual count and private dependent rereads fail", async () => {
  // Given
  let saved = false;
  mockFetch.mockImplementation((url, request) => {
    if (request?.method === "PUT") {
      saved = true;
      return Promise.resolve(Response.json({ following: true }));
    }
    if (
      saved &&
      (url.endsWith("/follower-count") || url.endsWith("/accounts/me"))
    )
      return Promise.reject(new TypeError("dependent read failed"));
    return transport(url, request);
  });
  const user = userEvent.setup();
  await fixture.render(<SportingActions target={team} season={season} />);
  await screen.findByLabelText("2 abonnés");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Suivre" }));
  await act(() =>
    fixture.client.invalidateQueries({
      predicate: (query) => query.queryKey.includes("/accounts/me"),
    }),
  );

  // Then
  expect(
    await screen.findByRole("button", {
      name: "Suivi",
      selected: true,
      busy: false,
    }),
  ).toBeOnTheScreen();
  expect(
    await screen.findByLabelText("2 abonnés, actualisation indisponible"),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "PUT"),
  ).toHaveLength(1);
});

it.each(["guest", "other"])(
  "rejects an old observation after A to %s to A",
  async (middle) => {
    // Given
    const observation = Promise.withResolvers<Response>();
    let attempted = false;
    let currentAccount = accountResponse().accountId;
    mockFetch.mockImplementation((url, request) => {
      if (request?.method === "PUT") {
        attempted = true;
        return Promise.reject(new TypeError("response lost"));
      }
      if (url.endsWith("/accounts/me"))
        return Promise.resolve(
          Response.json(accountResponse({ accountId: currentAccount })),
        );
      if (url.includes("/team-follows/") && attempted)
        return observation.promise;
      return transport(url, request);
    });
    const user = userEvent.setup();
    await fixture.render(<SportingActions target={team} season={season} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
    );
    const original = { ...fixture.session, accountId: currentAccount };
    const unbind = bindSessionQueries(
      fixture.client,
      fixture.session.subscribe,
      fixture.session.isCurrent,
    );
    try {
      await user.press(screen.getByRole("button", { name: "Suivre" }));
      await waitFor(() =>
        expect(
          mockFetch.mock.calls.filter(
            ([url, request]) =>
              url.includes("/team-follows/") && request?.method !== "PUT",
          ),
        ).toHaveLength(2),
      );

      // When
      await act(async () => {
        await fixture.session.clearCredentials();
      });
      mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|other"));
      mockAuth0.saveCredentials.mockResolvedValue();
      if (middle === "other") {
        currentAccount = "00000000-0000-4000-8000-000000000099";
        attempted = false;
        await act(async () => {
          await fixture.session.signIn("https://api.example.invalid");
        });
        await waitFor(() =>
          expect(fixture.session.accountId).toBe(currentAccount),
        );
        await act(async () => {
          await fixture.session.clearCredentials();
        });
      }
      currentAccount = original.accountId;
      attempted = false;
      mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|demo"));
      await act(async () => {
        await fixture.session.signIn("https://api.example.invalid");
      });
      await waitFor(() =>
        expect(fixture.session.accountId).toBe(original.accountId),
      );
      await act(async () => {
        observation.resolve(Response.json({ following: true }));
      });

      // Then
      await waitFor(() => expect(fixture.client.isMutating()).toBe(0));
      expect(
        await screen.findByRole("button", {
          name: "Suivre",
          selected: false,
          busy: false,
        }),
      ).toBeOnTheScreen();
      expect(
        fixture.client.getQueryData(followStateKey(original, team)),
      ).toBeUndefined();
      expect(
        mockFetch.mock.calls.filter(([, request]) => request?.method === "PUT"),
      ).toHaveLength(1);
    } finally {
      unbind();
    }
  },
);

it("rereads only the affected public counter after confirmation without provisional arithmetic", async () => {
  // Given
  const write = Promise.withResolvers<Response>();
  const count = Promise.withResolvers<Response>();
  const pool = { type: "pool", id: team.id } as const;
  let confirmed = false;
  mockFetch.mockImplementation((url, request) => {
    if (request?.method === "PUT") return write.promise;
    if (url.endsWith(`/teams/${team.id}/follower-count`) && confirmed)
      return count.promise;
    return transport(url, request);
  });
  const user = userEvent.setup();
  await fixture.render(
    <>
      <SportingActions target={team} season={season} />
      <FollowerCount target={pool} />
    </>,
  );
  await waitFor(() =>
    expect(screen.getAllByLabelText("2 abonnés")).toHaveLength(2),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Suivre" }));

  // Then
  expect(screen.getAllByLabelText("2 abonnés")).toHaveLength(2);
  expect(screen.queryByLabelText("3 abonnés")).not.toBeOnTheScreen();

  // When
  confirmed = true;
  await act(async () => {
    write.resolve(Response.json({ following: true }));
  });
  await screen.findByRole("button", { name: "Suivi", busy: false });
  await act(async () => {
    count.resolve(Response.json({ count: 7 }));
  });

  // Then
  expect(await screen.findByLabelText("7 abonnés")).toBeOnTheScreen();
  expect(screen.getByLabelText("2 abonnés")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      url.endsWith(`/teams/${team.id}/follower-count`),
    ),
  ).toHaveLength(2);
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      url.endsWith(`/pools/${pool.id}/follower-count`),
    ),
  ).toHaveLength(1);
});
