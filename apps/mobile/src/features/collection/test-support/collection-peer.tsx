import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Pressable, Text } from "react-native";
import type {
  CollectionControlResponse,
  CollectionResultResponse,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
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

/** Scenario-owned HTTP projections; tests may replace fields directly without changing the real application owners. */
interface CollectionPeer {
  season: CollectionSeasonResponse;
  controls: CollectionControlResponse[];
  results: CollectionResultResponse[];
  permissions: object;
  /** Serves only reads; each scenario installs its own explicit mutation response. */
  reads(url: RequestInfo | URL, options?: RequestInit): Promise<Response>;
}

/** Mutable HTTP peer only; React, Query, forms, authority and session owners remain real. */
export function collectionPeer(): CollectionPeer {
  const peer: CollectionPeer = {
    season: {
      id: seasonId,
      label: "2026/2027",
      startYear: 2026,
      revision: 5,
      state: "active",
    },
    controls: [control()],
    results: [],
    permissions: operator.permissions,
    reads,
  };
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
      return json({ ...operator, permissions: peer.permissions });
    if (path.endsWith("/collection-seasons"))
      return json({ items: [peer.season] });
    if (path.endsWith(`/collection-seasons/${seasonId}`))
      return json(peer.season);
    if (path.endsWith("/collection-controls"))
      return json({ items: peer.controls });
    const selected = peer.controls.find((value) =>
      path.endsWith(`/collection-controls/${value.id}`),
    );
    if (selected) return json(selected);
    if (path.endsWith("/results"))
      return json({ items: peer.results, page: 0, hasNext: false });
    throw new Error(`Unexpected controlled request ${path}`);
  }
  return peer;
}

/** Mounts the actual session/query/theme/access boundaries with only native identity and HTTP doubled by the suite. */
export function renderCollection(content: ReactElement, client: QueryClient) {
  return render(content, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <AccountFeedbackProvider>{children}</AccountFeedbackProvider>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  });
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
