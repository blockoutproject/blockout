import { QueryClientProvider, useInfiniteQuery } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { Button } from "../../../shared/components/button";
import { Tabs } from "../../../shared/components/tabs";
import { PersonalSeasonSelector } from "../components/personal-season-selector";
import { PersonalSeasonChoices } from "../components/personal-season-choices";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
import { usePersonalSeason } from "../hooks/use-personal-season";
import { followOptionsKey, type FollowingOwner } from "../api/following-keys";
import {
  createPersonalCalendarOptions,
  createFollowListOptions,
} from "../api/personal-queries";
import { useState } from "react";

// Native safe-area measurement is controlled; these interactions do not qualify sheet geometry.
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
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
const owner: FollowingOwner = {
  accountId,
  subject: "auth0|a",
};
let client = createQueryClient();
const environment = { ...process.env };

/** Controlled credential/inset I/O only; generated transport, validation, Query and scoped state are real. */
async function request(signal?: AbortSignal) {
  return { signal };
}

/** Shares the real choice and query boundary through selection controls; full list/calendar integration is tested with Home. */
function PersonalProbe({ enabled = true }: { enabled?: boolean }) {
  const season = usePersonalSeason(owner, request, enabled);
  const [tab, setTab] = useState("upcoming");
  const [choicesOpen, setChoicesOpen] = useState(false);
  const list = useInfiniteQuery({
    ...createFollowListOptions(
      owner,
      request,
      tab === "following" ? "pool" : "team",
      season.seasonId,
    ),
    enabled: enabled && Boolean(season.options.data),
  });

  let listStatus = "Loading";
  if (list.isSuccess) {
    listStatus = "Loaded";
  } else if (list.isError) {
    listStatus = "Read failed";
  }
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
        onPress={() => setChoicesOpen(true)}
        disabled={!season.options.data}
      />
      {choicesOpen && (
        <Sheet title="Saison des suivis" onClose={() => setChoicesOpen(false)}>
          <SheetContent>
            <PersonalSeasonChoices
              options={season.options.data!}
              seasonId={season.seasonId}
              onSelect={(id) => {
                season.selectSeason(id);
                setChoicesOpen(false);
              }}
              onReset={() => {
                season.resetSeason();
                setChoicesOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>
      )}
      <Text>{listStatus}</Text>
      <Button label="Retry read" onPress={() => void list.refetch()} />
      <Button
        label="Reload options"
        onPress={() => void season.options.refetch()}
      />
    </>
  );
}

/** Mounts the real Query/theme owners around the scoped personal-season consumer. */
async function mount(enabled = true) {
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <PersonalProbe enabled={enabled} />
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
  jest.useFakeTimers();
  client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
  });
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset().mockImplementation(async (url) => {
    if (url.includes("follow-options")) {
      return Response.json({
        seasons: [newer, older],
        defaultSeasonId: older.id,
      });
    }
    return Response.json({ items: [] });
  });
});
afterEach(async () => {
  await cleanup();
  client.clear();
  // Await pending Query batches before restoring the test's real timer environment.
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
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
  mockFetch.mockImplementation(async (url) => {
    if (url.includes("follow-options")) {
      return Response.json({
        seasons: [newer, older],
        defaultSeasonId: newer.id,
      });
    }
    return Response.json({ items: [] });
  });

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
    mockFetch.mockImplementation(async (url) => {
      if (url.includes("follow-options")) {
        if (fallback === "empty") {
          return Response.json({ seasons: [] });
        }
        return Response.json({ seasons: [newer], defaultSeasonId: newer.id });
      }
      return Response.json({ items: [] });
    });

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
  "does not reload options after seasonal NotFound despite %s of a future options read",
  async (outcome) => {
    // Given
    const user = userEvent.setup();
    await mount();
    await screen.findByText("Loaded");
    mockFetch.mockImplementation(async (url) => {
      if (url.includes("follow-options")) {
        if (outcome === "failure") {
          return new Response(null, { status: 503 });
        }
        return Response.json({
          seasons: [newer, older],
          defaultSeasonId: newer.id,
        });
      }
      return new Response(null, { status: 404 });
    });

    // When
    await user.press(screen.getByRole("button", { name: "Retry read" }));
    await screen.findByText("Read failed");

    // Then
    expect(optionReads()).toBe(1);
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label });

    // When
    await user.press(screen.getByRole("button", { name: "Retry read" }));
    await waitFor(() => expect(optionReads()).toBe(1));

    // Then
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label });
  },
);

it("keeps an unavailable selection until explicit options reload establishes its disappearance", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Loaded");
  mockFetch.mockImplementation(async (url) => {
    if (url.includes("follow-options")) {
      return Response.json({ seasons: [newer], defaultSeasonId: newer.id });
    }
    if (new URL(url).searchParams.get("seasonId") === older.id) {
      return new Response(null, { status: 404 });
    }
    return Response.json({ items: [] });
  });

  // When
  await user.press(screen.getByRole("button", { name: "Retry read" }));
  await screen.findByText("Read failed");

  // Then
  expect(optionReads()).toBe(1);
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: older.label });

  // When
  await user.press(screen.getByRole("button", { name: "Reload options" }));

  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: newer.label }),
  );
  await screen.findByText("Loaded");
  expect(optionReads()).toBe(2);
});

it.each([undefined, older.id])(
  "keeps a generated calendar NotFound ordinary for selection %s",
  async (seasonId) => {
    // Given
    mockFetch.mockResolvedValue(new Response(null, { status: 404 }));
    const options = createPersonalCalendarOptions(owner, request, {
      seasonId,
      category: "upcoming",
      timeZone: "Europe/Paris",
    });

    // When
    const calendar = client.fetchInfiniteQuery(options);

    // Then
    await expect(calendar).rejects.toMatchObject({
      status: 404,
    });
    expect(optionReads()).toBe(0);
  },
);

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

it.each([
  { status: 403, retries: false, transientBeforeUnmount: true },
  { status: 404, retries: false, transientBeforeUnmount: true },
  { status: 403, retries: 3, transientBeforeUnmount: false },
  { status: 403, retries: 3, transientBeforeUnmount: true },
] as const)(
  "withdraws refused $status options with retries=$retries and transientBeforeUnmount=$transientBeforeUnmount until successful remount",
  async ({ status, retries, transientBeforeUnmount }) => {
    // Given
    client.setQueryDefaults(followOptionsKey(owner), {
      retry: retries,
      retryDelay: 60_000,
    });
    const user = userEvent.setup();
    const first = await mount();
    await screen.findByText("Loaded");
    const bypassOptions = {
      seasons: [newer],
      defaultSeasonId: newer.id,
    };
    client.setQueryData(followOptionsKey(owner, true), bypassOptions);
    const retainedList = createFollowListOptions(
      owner,
      request,
      "team",
      older.id,
    ).queryKey;
    mockFetch.mockImplementation(async () => new Response(null, { status }));

    // When
    await user.press(screen.getByRole("button", { name: "Reload options" }));
    await waitFor(() =>
      expect(client.getQueryState(followOptionsKey(owner))?.status).toBe(
        "error",
      ),
    );

    // Then
    expect(optionReads()).toBe(2);
    expect(client.getQueryData(followOptionsKey(owner))).toBeUndefined();
    expect(client.getQueryData(followOptionsKey(owner, true))).toEqual(
      bypassOptions,
    );
    expect(client.getQueryData(retainedList)).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toBeDisabled();

    // When
    if (transientBeforeUnmount) {
      mockFetch.mockRejectedValue(new TypeError("Synthetic options outage"));
      await user.press(screen.getByRole("button", { name: "Reload options" }));
      await screen.findByRole("button", {
        name: "Saison des suivis",
        disabled: true,
      });
    }
    await first.unmount();

    // Then: cancelling a configured retry cannot restore the data from before the refusal.
    expect(client.getQueryData(followOptionsKey(owner))).toBeUndefined();
    expect(client.getQueryState(followOptionsKey(owner))?.status).toBe("error");

    // When
    const current = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((url) =>
      url.includes("follow-options")
        ? current.promise
        : Promise.resolve(Response.json({ items: [] })),
    );
    await mount();

    // Then
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toBeDisabled();
    expect(client.getQueryData(followOptionsKey(owner))).toBeUndefined();

    // When
    await act(async () => {
      current.resolve(
        Response.json({ seasons: [newer], defaultSeasonId: newer.id }),
      );
    });

    // Then
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Saison des suivis" }),
      ).toHaveAccessibilityValue({ text: newer.label }),
    );
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toBeEnabled();
  },
);

it("recalculates a new opening's default from fresh options even when Query retains an older successful read", async () => {
  // Given
  const first = await mount();
  await screen.findByText("Loaded");
  await first.unmount();
  mockFetch.mockImplementation(async (url) => {
    if (url.includes("follow-options")) {
      return Response.json({
        seasons: [newer, older],
        defaultSeasonId: newer.id,
      });
    }
    return Response.json({ items: [] });
  });

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

it("waits for an admitted opening before establishing a cached proposed season", async () => {
  // Given
  const first = await mount();
  await screen.findByText("Loaded");
  await first.unmount();
  mockFetch.mockImplementation(async (url) => {
    if (url.includes("follow-options")) {
      return Response.json({
        seasons: [newer, older],
        defaultSeasonId: newer.id,
      });
    }
    return Response.json({ items: [] });
  });
  const opening = await mount(false);
  expect(optionReads()).toBe(1);

  // When
  await opening.rerender(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <PersonalProbe enabled />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(optionReads()).toBe(2));

  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: newer.label }),
  );
});
