import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import {
  listTeamFollows,
  listPoolFollows,
  listPersonalMatches,
} from "../../../../.generated/mobile";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { Button } from "../../../shared/components/button";
import { Tabs } from "../../../shared/components/tabs";
import { PersonalSeasonSelector } from "../components/personal-season-selector";
import { usePersonalSeason } from "../hooks/use-personal-season";
import {
  followListKey,
  followOptionsKey,
  type FollowingOwner,
} from "../api/following-keys";
import {
  readPersonalSelection,
  createFollowOptionsQueryOptions,
} from "../api/personal-queries";
import { ApiError } from "../../../shared/api/api-fetch";
import { useState } from "react";

jest.mock("expo/fetch", () => ({
  fetch: (url: string, request?: RequestInit) => mockFetch(url, request),
}));
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
const accountId = "00000000-0000-4000-8000-000000000001";
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
let current = true;
const owner: FollowingOwner = {
  accountId,
  generation: "season-session",
  isCurrent: () => current,
};
let client = createQueryClient();
const environment = { ...process.env };

/** Controlled credential preparation only; generated transport, validation, Query and scoped state are real. */
async function request(signal?: AbortSignal) {
  return { signal, session: owner };
}

/** Future tab/list consumers observe one scoped choice; no future list/calendar UI is simulated as production. */
function PersonalProbe() {
  const season = usePersonalSeason(owner, request, true);
  const [tab, setTab] = useState("upcoming");
  const list = useQuery({
    queryKey: [
      ...followListKey(
        owner,
        tab === "following" ? "pool" : "team",
        season.seasonId ? { seasonId: season.seasonId } : {},
      ),
      tab,
    ],
    enabled: Boolean(season.options.data),
    queryFn: ({ signal }) =>
      season.read(season.seasonId, signal, async () => {
        const options = await request(signal);
        return tab === "following"
          ? listPoolFollows(
              accountId,
              season.seasonId ? { seasonId: season.seasonId } : {},
              options,
            )
          : listTeamFollows(
              accountId,
              season.seasonId ? { seasonId: season.seasonId } : {},
              options,
            );
      }),
  });
  return (
    <>
      <Tabs
        items={[
          { id: "upcoming", label: "À venir" },
          { id: "completed", label: "Terminés" },
          { id: "following", label: "Suivis" },
        ]}
        selected={tab}
        onSelect={setTab}
      />
      <PersonalSeasonSelector
        options={season.options.data}
        seasonId={season.seasonId}
        onSelect={season.selectSeason}
        onReset={season.resetSeason}
        disabled={!season.options.data}
      />
      <Text>
        {list.isSuccess ? "Loaded" : list.isError ? "Read failed" : "Loading"}
      </Text>
      <Button label="Retry read" onPress={() => void list.refetch()} />
      <Button
        label="Reload options"
        onPress={() => void season.options.refetch()}
      />
    </>
  );
}

/** Mounts the real Query/theme owners around the scoped personal-season consumer. */
async function mount() {
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <PersonalProbe />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

/** Counts requests at the actual HTTP seam without inspecting Query implementation details. */
function optionReads() {
  return mockFetch.mock.calls.filter(([url]) => url.includes("follow-options"))
    .length;
}

beforeEach(() => {
  current = true;
  client = createQueryClient();
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
  });
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch
    .mockReset()
    .mockImplementation(async (url) =>
      Response.json(
        url.includes("follow-options")
          ? { seasons: [newer, older], defaultSeasonId: older.id }
          : { items: [] },
      ),
    );
});
afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

it("shares one retained choice across all three tabs and both generated list selections", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Loaded");

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
  await user.press(screen.getByRole("radio", { name: newer.label }));
  await user.press(screen.getByRole("tab", { name: "Terminés" }));
  await user.press(screen.getByRole("tab", { name: "Suivis" }));

  // Then
  await screen.findByText("Loaded");
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: newer.label });
  expect(
    mockFetch.mock.calls.some(
      ([url]) =>
        url.includes("pool-follows") &&
        new URL(url).searchParams.get("seasonId") === newer.id,
    ),
  ).toBe(true);
});

it("omits seasonId for All seasons and resets to the latest successful proposed season", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Loaded");

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
  await user.press(screen.getByRole("radio", { name: "Toutes les saisons" }));

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(
        ([url]) =>
          url.includes("team-follows") &&
          !new URL(url).searchParams.has("seasonId"),
      ),
    ).toBe(true),
  );
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: "Toutes saisons" });

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
  await user.press(
    screen.getByRole("button", {
      name: "Revenir à la saison proposée (2025/2026)",
    }),
  );

  // Then
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: older.label });
});

it("keeps a valid choice when refreshed options propose another-season follow or a newer catalogue", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Loaded");
  mockFetch.mockImplementation(async (url) =>
    Response.json(
      url.includes("follow-options")
        ? { seasons: [newer, older], defaultSeasonId: newer.id }
        : { items: [] },
    ),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Reload options" }));
  await waitFor(() => expect(optionReads()).toBe(2));

  // Then
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: older.label });
});

it.each(["empty", "default"])(
  "reconciles a successful disappearance to %s without an unavailable option",
  async (fallback) => {
    // Given
    const user = userEvent.setup();
    await mount();
    await screen.findByText("Loaded");
    mockFetch.mockImplementation(async (url) =>
      Response.json(
        url.includes("follow-options")
          ? fallback === "empty"
            ? { seasons: [] }
            : { seasons: [newer], defaultSeasonId: newer.id }
          : { items: [] },
      ),
    );

    // When
    await user.press(screen.getByRole("button", { name: "Reload options" }));

    // Then
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Saison des suivis" }),
      ).toHaveAccessibilityValue({
        text: fallback === "empty" ? "Toutes saisons" : newer.label,
      }),
    );
  },
);

it.each(["offered", "failure"])(
  "performs one bounded options reread on a seasonal NotFound and retains the choice after %s",
  async (outcome) => {
    // Given
    const user = userEvent.setup();
    await mount();
    await screen.findByText("Loaded");
    mockFetch.mockImplementation(async (url) =>
      url.includes("follow-options")
        ? outcome === "failure"
          ? new Response(null, { status: 503 })
          : Response.json({
              seasons: [newer, older],
              defaultSeasonId: newer.id,
            })
        : new Response(null, { status: 404 }),
    );

    // When
    await user.press(screen.getByRole("button", { name: "Retry read" }));
    await screen.findByText("Read failed");

    // Then
    expect(optionReads()).toBe(2);
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label });

    // When
    await user.press(screen.getByRole("button", { name: "Retry read" }));
    await waitFor(() => expect(optionReads()).toBe(3));

    // Then
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label });
  },
);

it("loads the new context only after the bounded reread proves omission", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Loaded");
  mockFetch.mockImplementation(async (url) =>
    url.includes("follow-options")
      ? Response.json({ seasons: [newer], defaultSeasonId: newer.id })
      : new URL(url).searchParams.get("seasonId") === older.id
        ? new Response(null, { status: 404 })
        : Response.json({ items: [] }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Retry read" }));

  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: newer.label }),
  );
  await screen.findByText("Loaded");
  expect(optionReads()).toBe(2);
});

it("rejects a late options response after its original session retires", async () => {
  // Given
  const response = Promise.withResolvers<Response>();
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Loaded");
  mockFetch.mockImplementation(() => response.promise);

  // When
  await user.press(screen.getByRole("button", { name: "Reload options" }));
  current = false;
  await act(async () => {
    response.resolve(
      Response.json({ seasons: [], defaultSeasonId: undefined }),
    );
  });

  // Then
  await waitFor(() =>
    expect(client.getQueryState(followOptionsKey(owner))?.fetchStatus).toBe(
      "idle",
    ),
  );
  expect(client.getQueryData(followOptionsKey(owner))).toEqual({
    seasons: [newer, older],
    defaultSeasonId: older.id,
  });
});

it("does not reread options for an All-seasons NotFound", async () => {
  // Given
  const selectSeason = jest.fn();
  const context = {
    client,
    owner,
    seasonId: undefined,
    signal: new AbortController().signal,
    options: createFollowOptionsQueryOptions(owner, request),
    isCurrent: () => true,
    selectSeason,
  };
  const notFound = new ApiError("http", 404);

  // When / Then
  await expect(
    readPersonalSelection(context, async () => {
      throw notFound;
    }),
  ).rejects.toBe(notFound);
  expect(mockFetch).not.toHaveBeenCalled();
  expect(selectSeason).not.toHaveBeenCalled();
});

it("uses the same bounded reconciliation for the real generated calendar", async () => {
  // Given
  mockFetch.mockImplementation(async (url) =>
    url.includes("follow-options")
      ? Response.json({ seasons: [], defaultSeasonId: undefined })
      : new Response(null, { status: 404 }),
  );
  const selectSeason = jest.fn();
  const signal = new AbortController().signal;

  // When / Then
  await expect(
    readPersonalSelection(
      {
        client,
        owner,
        seasonId: older.id,
        signal,
        options: createFollowOptionsQueryOptions(owner, request),
        isCurrent: () => true,
        selectSeason,
      },
      () =>
        listPersonalMatches(
          accountId,
          {
            category: "upcoming",
            timeZone: "Europe/Paris",
            seasonId: older.id,
          },
          { signal, session: owner },
        ),
    ),
  ).rejects.toMatchObject({ kind: "cancelled" });
  expect(selectSeason).toHaveBeenCalledWith(undefined);
  expect(optionReads()).toBe(1);
});

it("keeps the explicit newer choice when an older seasonal read completes late", async () => {
  // Given
  const response = Promise.withResolvers<Response>();
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Loaded");
  mockFetch.mockImplementation(async (url) =>
    new URL(url).searchParams.get("seasonId") === older.id
      ? response.promise
      : Response.json({ items: [] }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Retry read" }));
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
  await user.press(screen.getByRole("radio", { name: newer.label }));
  await act(async () => {
    response.resolve(new Response(null, { status: 404 }));
  });

  // Then
  await screen.findByText("Loaded");
  expect(optionReads()).toBe(1);
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: newer.label });
});

it("retains the current choice when an ordinary choices refresh fails", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Loaded");
  mockFetch.mockImplementation(async () => new Response(null, { status: 503 }));

  // When
  await user.press(screen.getByRole("button", { name: "Reload options" }));
  await waitFor(() =>
    expect(client.getQueryState(followOptionsKey(owner))?.status).toBe("error"),
  );

  // Then
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: older.label });
});

it("recalculates a new opening's default from fresh options even when Query retains an older successful read", async () => {
  // Given
  const first = await mount();
  await screen.findByText("Loaded");
  await first.unmount();
  mockFetch.mockImplementation(async (url) =>
    Response.json(
      url.includes("follow-options")
        ? { seasons: [newer, older], defaultSeasonId: newer.id }
        : { items: [] },
    ),
  );

  // When
  await mount();
  await waitFor(() => expect(optionReads()).toBe(2));
  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: newer.label }),
  );
});
