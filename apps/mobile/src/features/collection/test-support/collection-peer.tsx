import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Alert, Pressable, Text } from "react-native";
import type {
  CollectionControlResponse,
  CollectionResultResponse,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";

/** Stable synthetic identifiers shared by dashboard and closure scenarios. */
export const seasonId = "00000000-0000-4000-8000-000000000187";
/** The current operator projection exercises F12's actual capability owner. */
export const operator = {
  accountId: "00000000-0000-4000-8000-000000000188",
  username: "Operator_187",
  email: "operator@example.invalid",
  principalCreatedAt: null,
  hasPhoto: false,
  permissions: { manageCollection: true },
};

/** Complete valid control; each scenario specifies the behavior-bearing lifecycle fields. */
export function control(
  overrides: Partial<CollectionControlResponse> = {},
): CollectionControlResponse {
  return {
    id: "00000000-0000-4000-8000-000000000189",
    family: "ffvb",
    seasonId,
    revision: 3,
    enabled: true,
    pendingRequestId: null,
    lastAttemptAt: null,
    lastSuccessAt: null,
    ...overrides,
  };
}

/** Scoped evidence remains independent from control execution and successes elsewhere. */
export function result(
  overrides: Partial<CollectionResultResponse> = {},
): CollectionResultResponse {
  return {
    scopeId: "00000000-0000-4000-8000-000000000190",
    scopeLabel: "Nationale 2 · Poule A",
    stage: "calendar",
    phase: "integration",
    outcome: "unconfirmed",
    observedAt: "2026-10-24T12:00:00Z",
    lastSuccessAt: null,
    firstFailureAt: null,
    ...overrides,
  };
}

/** Real Fetch representations pass through the generated decoder, including error responses. */
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Content-Type":
        status < 400 ? "application/json" : "application/problem+json",
    },
  });
}

/** Safe canonical problem category for a refused command. */
export function refused(status: number) {
  return json(
    {
      type:
        status === 409
          ? "urn:blockout:problem:stale-revision"
          : "urn:blockout:problem:unprocessable-content",
      title: "Refused",
      status,
    },
    status,
  );
}

/** Mutable HTTP peer only; React, Query, forms, authority and session owners remain real. */
export function collectionPeer() {
  const client = createQueryClient();
  let season: CollectionSeasonResponse = {
    id: seasonId,
    label: "2026/2027",
    startYear: 2026,
    revision: 5,
    state: "active",
  };
  let controls = [control()];
  let results: CollectionResultResponse[] = [];
  let permissions: object = operator.permissions;
  /** Strict default reads refuse accidental mutation requests. Tests install writes beside their decisive actions. */
  async function reads(
    url: RequestInfo | URL,
    options?: RequestInit,
  ): Promise<Response> {
    const request = new URL(String(url));
    if (options?.method && options.method !== "GET")
      throw new Error("Unexpected mutation");
    const path = request.pathname;
    if (path.endsWith("/application-access"))
      return json(applicationAccessResponse());
    if (path.endsWith("/accounts/me"))
      return json({ ...operator, permissions });
    if (path.endsWith("/collection-seasons")) return json({ items: [season] });
    if (path.endsWith(`/collection-seasons/${seasonId}`)) return json(season);
    if (path.endsWith("/collection-controls")) return json({ items: controls });
    if (
      controls.some((value) =>
        path.endsWith(`/collection-controls/${value.id}`),
      )
    )
      return json(controls.find((value) => path.endsWith(value.id)));
    if (path.endsWith("/results"))
      return json({ items: results, page: 0, hasNext: false });
    throw new Error(`Unexpected controlled request ${path}`);
  }
  return {
    client,
    reads,
    get season() {
      return season;
    },
    set season(value) {
      season = value;
    },
    get controls() {
      return controls;
    },
    set controls(value) {
      controls = value;
    },
    get results() {
      return results;
    },
    set results(value) {
      results = value;
    },
    set permissions(value: object) {
      permissions = value;
    },
  };
}

/** Mounts the actual session/query/theme/access boundaries with only native identity and HTTP doubled by the suite. */
export function renderCollection(
  content: ReactElement,
  client: ReturnType<typeof createQueryClient>,
) {
  return render(content, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>{children}</AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  });
}

/** Accepts only an already displayed native confirmation, never an action hidden in fixture setup. */
export async function confirm(label: string) {
  const action = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find((choice) => choice.text === label);
  if (!action?.onPress) throw new Error(`Missing native action ${label}`);
  await act(async () => action.onPress?.());
}

/** Real account actions expose permission refresh and F05 invalidation without bypassing their owners. */
export function AccountActions() {
  const account = useCurrentAccount();
  const session = useAccountSession();
  return (
    <>
      <Text>Session : {session.status}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Actualiser les permissions"
        onPress={() => void account.refetch()}
      >
        <Text>Actualiser les permissions</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Déconnexion"
        onPress={() => void session.signOut()}
      >
        <Text>Déconnexion</Text>
      </Pressable>
    </>
  );
}

/** Requests a displayed control action using its real accessible name. */
export async function pressAction(label: string) {
  await userEvent
    .setup()
    .press(await screen.findByRole("button", { name: label }));
}
