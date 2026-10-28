import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { NotificationResponse } from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { NotificationItem } from "../components/notification-item";
import { notificationResponse } from "../test-support/notification-data";
import { notificationMessageSamples } from "../test-support/notification-message-samples";

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
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const environment = { ...process.env };
const NativeDateTimeFormat = Intl.DateTimeFormat;
let deviceZone: string;
let client = createQueryClient();

beforeEach(() => {
  client = createQueryClient();
  deviceZone = "Europe/Paris";
  jest.useFakeTimers({ now: new Date("2026-10-28T12:00:00Z") });
  // Only the device zone is controlled; date-specific Intl conversions stay real.
  jest.spyOn(Intl, "DateTimeFormat").mockImplementation(
    (locales, options) =>
      new NativeDateTimeFormat(locales, {
        ...options,
        timeZone: options?.timeZone ?? deviceZone,
      }),
  );
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "synthetic-client";
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  mockFetch
    .mockReset()
    .mockResolvedValue(Response.json(applicationAccessResponse()));
});
afterEach(async () => {
  await cleanup();
  client.clear();
  jest.restoreAllMocks();
  jest.useRealTimers();
  process.env = { ...environment };
});

/** Real theme, admission, session and sporting presentation; HTTP/native identity are controlled. */
function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>{children}</AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

it.each(notificationMessageSamples)(
  "preserves the supplied %s variant: %s",
  async (family, title) => {
    // Given
    const row = notificationResponse();
    row.family = family;
    row.title = title;
    row.match.home.name = "Nantes";
    row.match.away.name = "Tours";
    row.match.result = {
      state: "final",
      homeSets: 3,
      awaySets: 1,
      observedAt: row.createdAt,
    };
    const accepted = NotificationResponse.parse(row);
    const onPress = jest.fn();

    // When
    await render(
      <NotificationItem notification={accepted} onPress={onPress} />,
      { wrapper: Providers },
    );

    // Then
    expect(screen.getByText(title)).toBeOnTheScreen();
    expect(screen.getByRole("link")).toHaveAccessibleName(
      `${title} Poule A. Nantes, Score domicile : 3. Tours, Score extérieur : 1. 24 oct. 2026 à 03:02 — non lue`,
    );
    expect(screen.getByText("3")).toBeOnTheScreen();
    expect(screen.getByText("1")).toBeOnTheScreen();
    expect(onPress).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/en direct|replay vérifié|gratuit|victoire/i),
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: /supprimer|archiver|réglages|campagne/i,
      }),
    ).toBeNull();
  },
);

it.each([
  ["Forfait", "Résultat particulier : Forfait."],
  [undefined, "Résultat confirmé, score indisponible."],
])(
  "keeps a special or unknown result without a numeric score: %s",
  async (specialLabel, text) => {
    // Given
    const row = notificationResponse();
    row.title = `Petit tour du terrain : ce match. ${text}`;
    row.match.home.name = "";
    row.match.away.name = " ";
    row.match.result = {
      state: "final",
      specialLabel,
      observedAt: row.createdAt,
    };

    // When
    await render(
      <NotificationItem
        notification={NotificationResponse.parse(row)}
        onPress={jest.fn()}
      />,
      { wrapper: Providers },
    );

    // Then
    expect(screen.getByText(row.title)).toBeOnTheScreen();
    expect(screen.getAllByText("Nom indisponible")).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: /Nom indisponible.*non lue$/ }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByText("3")).toBeNull();
  },
);

it("replaces corrected names, removes a withdrawn score/link and keeps read intent explicit", async () => {
  // Given
  const row = notificationResponse();
  row.family = "result-with-link";
  row.title =
    "Petit récap : le match Nantes – Tours. Score final : 3–0. Un lien a été proposé pour ce match.";
  row.match.home.name = "Nantes";
  row.match.away.name = "Tours";
  row.match.result = {
    state: "final",
    homeSets: 3,
    awaySets: 0,
    observedAt: row.createdAt,
  };
  const onPress = jest.fn();
  const user = userEvent.setup();
  const view = await render(
    <NotificationItem
      notification={NotificationResponse.parse(row)}
      onPress={onPress}
    />,
    { wrapper: Providers },
  );
  expect(
    screen.getByRole("link", {
      name: /Score domicile : 3.*Score extérieur : 0/,
    }),
  ).toBeOnTheScreen();

  // When: the same entry receives current server facts and confirmed reading.
  const corrected = NotificationResponse.parse({
    ...row,
    read: true,
    title:
      "Petit récap : le match Rezé – Tours. Le résultat n’est pas confirmé actuellement. Le lien n’est plus proposé.",
    match: {
      ...row.match,
      home: { ...row.match.home, name: "Rezé" },
      result: { ...row.match.result, state: "unconfirmed" },
    },
  });
  await view.rerender(
    <NotificationItem notification={corrected} onPress={onPress} />,
  );

  // Then
  const link = screen.getByRole("link", {
    name: /Le lien n’est plus proposé.*— lue$/,
  });
  expect(screen.getByText(corrected.title)).toBeOnTheScreen();
  expect(screen.getByText("Rezé")).toBeOnTheScreen();
  expect(screen.queryByText("Nantes")).toBeNull();
  expect(screen.queryByText("3")).toBeNull();
  expect(screen.queryByText("0")).toBeNull();
  expect(screen.getByHintText("Ouvrir la fiche du match")).toBe(link);
  expect(onPress).not.toHaveBeenCalled();

  // When
  await user.press(link);

  // Then
  expect(onPress).toHaveBeenCalledTimes(1);
});

it.each([{ homeSets: 0 }, { awaySets: 3 }])(
  "does not complete an incomplete final score: %j",
  async (totals) => {
    // Given
    const row = notificationResponse();
    row.title =
      "Petit tour du terrain : ce match. Résultat confirmé, score indisponible.";
    row.match.result = { state: "final", observedAt: row.createdAt, ...totals };

    // When
    await render(
      <NotificationItem
        notification={NotificationResponse.parse(row)}
        onPress={jest.fn()}
      />,
      { wrapper: Providers },
    );

    // Then
    expect(screen.getByText(row.title)).toBeOnTheScreen();
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByText("3")).toBeNull();
    expect(
      screen.getByRole("link", { name: /score indisponible.*non lue$/ }),
    ).toBeOnTheScreen();
  },
);

it.each([
  ["2026-03-15T19:00:00Z", "15 mars 2026 à 20:00", "15 mars 2026 à 15:00"],
  ["2026-03-29T01:30:00Z", "29 mars 2026 à 03:30", "28 mars 2026 à 21:30"],
  ["2026-10-25T01:30:00Z", "25 oct. 2026 à 02:30", "24 oct. 2026 à 21:30"],
  ["2026-11-01T06:30:00Z", "1 nov. 2026 à 07:30", "1 nov. 2026 à 01:30"],
])(
  "presents original instant %s in Paris then New York without changing editorial or reading",
  async (createdAt, paris, newYork) => {
    // Given
    const row = NotificationResponse.parse({
      ...notificationResponse(),
      createdAt,
    });
    const onPress = jest.fn();
    const view = await render(
      <NotificationItem notification={row} onPress={onPress} />,
      { wrapper: Providers },
    );
    expect(screen.getByText(paris)).toBeOnTheScreen();

    // When
    deviceZone = "America/New_York";
    await view.rerender(
      <NotificationItem notification={row} onPress={onPress} />,
    );

    // Then
    expect(screen.getByText(newYork)).toBeOnTheScreen();
    expect(screen.getByText(row.title)).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: /non lue$/ })).toBeOnTheScreen();
    expect(row.createdAt).toBe(createdAt);
    expect(onPress).not.toHaveBeenCalled();
  },
);

it("exposes the full names and reading state while a tap is pending", async () => {
  // Given: native narrow/200% layout remains a device qualification, not a Jest geometry claim.
  const row = notificationResponse();
  row.match.home.name = "Volley des Deux Rives et de la Vallée";
  row.match.pool.pool.name = "Poule de Prénationale au libellé complet";
  const onPress = jest.fn();
  const user = userEvent.setup();

  // When
  await render(
    <NotificationItem
      notification={NotificationResponse.parse(row)}
      onPress={onPress}
      pending
    />,
    { wrapper: Providers },
  );
  const link = screen.getByRole("link", {
    name: /Poule de Prénationale au libellé complet.*Volley des Deux Rives et de la Vallée.*non lue$/,
  });
  await user.press(link);

  // Then
  expect(link).toBeDisabled();
  expect(screen.getByRole("link", { busy: true, disabled: true })).toBe(link);
  expect(onPress).not.toHaveBeenCalled();
});
