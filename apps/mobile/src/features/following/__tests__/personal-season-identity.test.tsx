import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text, TextInput } from "react-native";
import { useState } from "react";
import { Button } from "@/shared/components/button";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";
import { useCurrentAccount } from "@/features/accounts/current-account";
import { accountResponse } from "@/features/accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import {
  PersonalSeasonProvider,
  usePersonalSeasonScope,
} from "../components/personal-season-provider";
import { followingFixture } from "../test-support/following-fixture";
import { getGetFollowOptionsQueryKey } from "../../../../.generated/mobile";

jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo/fetch", () => ({
  fetch: (url: string, request?: RequestInit) => mockFetch(url, request),
}));

const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
const environment = { ...process.env };
const older = {
  id: "00000000-0000-4000-8000-000000000002",
  startYear: 2025,
  label: "2025/2026",
};
const newer = {
  id: "00000000-0000-4000-8000-000000000003",
  startYear: 2026,
  label: "2026/2027",
};
let fixture: ReturnType<typeof followingFixture>;

/** Exercises the real shared choice and account reread without mounting Home's unrelated native pager. */
function SeasonChoice() {
  const scope = usePersonalSeasonScope();
  const account = useCurrentAccount();
  if (!scope) {
    return null;
  }
  const selected = scope.season.options.data?.seasons.find(
    (season) => season.id === scope.season.seasonId,
  );
  return (
    <>
      <Text>{selected?.label}</Text>
      {scope.season.options.isSuccess && <Text>Saisons disponibles</Text>}
      {account.isError && <Text>Relecture du compte indisponible</Text>}
      <Button
        label="Choisir la saison précédente"
        onPress={() => scope.season.selectSeason(older.id)}
      />
      <Button label="Relire le compte" onPress={() => void account.refetch()} />
    </>
  );
}

/** Represents unrelated public input below the shared provider, outside the private season scope. */
function PublicDraft() {
  const [value, setValue] = useState("");
  return (
    <TextInput
      accessibilityLabel="Brouillon public"
      value={value}
      onChangeText={setValue}
    />
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  fixture = followingFixture();
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|same-principal"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(async (url) => {
    if (url.endsWith("/application-access")) {
      return Response.json(applicationAccessResponse());
    }
    if (url.endsWith("/accounts/me")) {
      return Response.json(accountResponse());
    }
    return Response.json({
      seasons: [newer, older],
      defaultSeasonId: newer.id,
    });
  });
});

afterEach(async () => {
  await cleanup();
  fixture.dispose();
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

it("defers personal season reads until enabled and retains the selected season while paused", async () => {
  // Given: the same account owner is mounted outside Home.
  const user = userEvent.setup();
  const view = await fixture.render(
    <PersonalSeasonProvider enabled={false}>
      <SeasonChoice />
    </PersonalSeasonProvider>,
  );
  await waitFor(() =>
    expect(fixture.session.accountId).toBe(accountResponse().accountId),
  );
  expect(
    mockFetch.mock.calls.some(([url]) => url.endsWith("/follow-options")),
  ).toBe(false);

  // When
  await view.rerender(
    <PersonalSeasonProvider>
      <SeasonChoice />
    </PersonalSeasonProvider>,
  );
  await screen.findByText("Saisons disponibles");
  await user.press(
    screen.getByRole("button", { name: "Choisir la saison précédente" }),
  );
  const reads = mockFetch.mock.calls.length;

  // When
  await view.rerender(
    <PersonalSeasonProvider enabled={false}>
      <SeasonChoice />
    </PersonalSeasonProvider>,
  );
  await act(() =>
    fixture.client.invalidateQueries({
      queryKey: getGetFollowOptionsQueryKey(accountResponse().accountId),
    }),
  );

  // Then
  expect(mockFetch).toHaveBeenCalledTimes(reads);
  expect(screen.getByText(older.label)).toBeOnTheScreen();
  expect(screen.queryByText(newer.label)).not.toBeOnTheScreen();
});

it("resets the personal season when the business UUID changes under the same native principal", async () => {
  // Given: both accounts offer both seasons, so the former choice is still valid but belongs to another UUID.
  const user = userEvent.setup();
  await fixture.render(
    <PersonalSeasonProvider>
      <SeasonChoice />
    </PersonalSeasonProvider>,
  );
  await screen.findByText("Saisons disponibles");
  await user.press(
    screen.getByRole("button", { name: "Choisir la saison précédente" }),
  );
  expect(screen.getByText(older.label)).toBeOnTheScreen();
  const replacement = accountResponse({
    accountId: "00000000-0000-4000-8000-000000000004",
  });
  mockFetch.mockImplementationOnce(async () => Response.json(replacement));

  // When
  await user.press(screen.getByRole("button", { name: "Relire le compte" }));
  await waitFor(() =>
    expect(fixture.session.accountId).toBe(replacement.accountId),
  );
  await screen.findByText("Saisons disponibles");

  // Then
  expect(fixture.session.subject).toBe("auth0|same-principal");
  expect(screen.getByText(newer.label)).toBeOnTheScreen();
  expect(screen.queryByText(older.label)).not.toBeOnTheScreen();
});

it("preserves public input when the business identity appears, changes and is withdrawn", async () => {
  // Given: native authentication has settled but its business UUID is still being read.
  const initialProfile = Promise.withResolvers<Response>();
  const response = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation((url, request) =>
    url.endsWith("/accounts/me")
      ? initialProfile.promise
      : response(url, request),
  );
  const user = userEvent.setup();
  await fixture.render(
    <PersonalSeasonProvider>
      <PublicDraft />
      <SeasonChoice />
    </PersonalSeasonProvider>,
  );
  await waitFor(() =>
    expect(fixture.session.subject).toBe("auth0|same-principal"),
  );
  await user.type(screen.getByLabelText("Brouillon public"), "Texte conservé");

  // When
  await act(() => initialProfile.resolve(Response.json(accountResponse())));
  await screen.findByText("Saisons disponibles");
  await user.press(
    screen.getByRole("button", { name: "Choisir la saison précédente" }),
  );

  // Then
  expect(screen.getByDisplayValue("Texte conservé")).toBeOnTheScreen();
  expect(screen.getByText(older.label)).toBeOnTheScreen();

  // When
  const replacement = accountResponse({
    accountId: "00000000-0000-4000-8000-000000000004",
  });
  mockFetch.mockImplementation(async (url, request) =>
    url.endsWith("/accounts/me")
      ? Response.json(replacement)
      : response(url, request),
  );
  await user.press(screen.getByRole("button", { name: "Relire le compte" }));
  await waitFor(() =>
    expect(fixture.session.accountId).toBe(replacement.accountId),
  );
  await screen.findByText("Saisons disponibles");

  // Then
  expect(screen.getByDisplayValue("Texte conservé")).toBeOnTheScreen();
  expect(screen.getByText(newer.label)).toBeOnTheScreen();
  expect(screen.queryByText(older.label)).not.toBeOnTheScreen();

  // When: account withdrawal removes the season scope without changing the native principal.
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
  await user.press(screen.getByRole("button", { name: "Relire le compte" }));
  await waitFor(() => expect(fixture.session.accountId).toBeNull());

  // Then
  expect(screen.getByDisplayValue("Texte conservé")).toBeOnTheScreen();
  expect(screen.queryByText("Saisons disponibles")).not.toBeOnTheScreen();
  expect(screen.queryByText(older.label)).not.toBeOnTheScreen();
});

it("keeps the personal season after a technical reread failure for the same UUID", async () => {
  // Given
  const user = userEvent.setup();
  await fixture.render(
    <PersonalSeasonProvider>
      <SeasonChoice />
    </PersonalSeasonProvider>,
  );
  await screen.findByText("Saisons disponibles");
  await user.press(
    screen.getByRole("button", { name: "Choisir la saison précédente" }),
  );
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 503 }));

  // When
  await user.press(screen.getByRole("button", { name: "Relire le compte" }));
  await screen.findByText("Relecture du compte indisponible");

  // Then
  expect(fixture.session.subject).toBe("auth0|same-principal");
  expect(fixture.session.accountId).toBe(accountResponse().accountId);
  expect(screen.getByText(older.label)).toBeOnTheScreen();
  expect(screen.queryByText(newer.label)).not.toBeOnTheScreen();
});
