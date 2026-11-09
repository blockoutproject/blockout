import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { Button } from "../../../shared/components/button";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  PersonalSeasonProvider,
  usePersonalSeasonScope,
} from "../components/personal-season-provider";
import { followingFixture } from "../test-support/following-fixture";

jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
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
      {scope.profile.isError && <Text>Relecture du compte indisponible</Text>}
      <Button
        label="Choisir la saison précédente"
        onPress={() => scope.season.selectSeason(older.id)}
      />
      <Button
        label="Relire le compte"
        onPress={() => void scope.profile.refetch()}
      />
    </>
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
