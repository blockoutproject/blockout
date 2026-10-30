import { waitFor } from "@testing-library/react-native";
import type {
  PoolParticipantResponse,
  PoolParticipantsResponse,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { createMaintenanceBypass } from "../../access/state/maintenance-bypass";
import { createConsultationQueries } from "../api/consultation-queries";
import { sportingId } from "../test-support/consultation-data";

jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

const mockFetch = jest.fn();
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const secondPoolId = "00000000-0000-4000-8000-000000002155";
const unrelatedPoolId = "00000000-0000-4000-8000-000000002156";
const retainedTeamId = "00000000-0000-4000-8000-000000002157";
const refusedParticipant: PoolParticipantResponse = {
  team: {
    team: { id: sportingId, name: "Rives" },
    season: { id: sportingId, label: "2026/2027", startYear: 2026 },
    classification: {},
    professional: false,
    club: { id: sportingId, name: "Club des Rives" },
  },
  location: { latitude: 46.16, longitude: -1.15, label: "La Rochelle" },
};
const retainedParticipant: PoolParticipantResponse = {
  ...refusedParticipant,
  team: {
    ...refusedParticipant.team,
    team: { id: retainedTeamId, name: "Marais" },
  },
};
let client = createQueryClient();

/** Captures a real current ordinary session; generated decoding and cache behavior remain intact. */
function publicQueries() {
  const session = createSessionGeneration();
  return createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { request: (options) => options },
    jest.fn(),
  );
}

beforeEach(() => {
  client = createQueryClient();
  mockFetch.mockReset();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
});

afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it.each([401, 403, 404])(
  "removes a team refused with %i from every same-context pool while preserving coincident teams and other admission contexts",
  async (status) => {
    // Given
    const clock = jest.spyOn(Date, "now").mockReturnValue(1_790_000_000_000);
    const session = createSessionGeneration();
    session.setAccount(session.getSnapshot().generation, sportingId);
    const captured = {
      ...session.getSnapshot(),
      isCurrent: session.isCurrent,
    };
    const queries = createConsultationQueries(
      captured,
      { request: (options) => options },
      jest.fn(),
    );
    const bypass = createMaintenanceBypass();
    bypass.request(session.getSnapshot(), true);
    const bypassQueries = createConsultationQueries(
      captured,
      { bypass: bypass.getSnapshot(), request: (options) => options },
      async () => ({ accessToken: "synthetic-token" }),
    );
    const otherSession = publicQueries();
    const first: PoolParticipantsResponse = {
      poolId: sportingId,
      items: [refusedParticipant, retainedParticipant],
    };
    const second: PoolParticipantsResponse = {
      poolId: secondPoolId,
      items: [refusedParticipant],
    };
    const unrelated: PoolParticipantsResponse = {
      poolId: unrelatedPoolId,
      items: [retainedParticipant],
    };
    mockFetch.mockImplementation((url: string) => {
      const path = new URL(url).pathname;
      if (path === `/pools/${sportingId}/participants`)
        return Promise.resolve(Response.json(first));
      if (path === `/pools/${secondPoolId}/participants`)
        return Promise.resolve(Response.json(second));
      if (path === `/pools/${unrelatedPoolId}/participants`)
        return Promise.resolve(Response.json(unrelated));
      return Promise.resolve(Response.json({}, { status }));
    });
    await client.query(queries.participants(sportingId));
    await client.query(queries.participants(secondPoolId));
    await client.query(queries.participants(unrelatedPoolId));
    await client.query(bypassQueries.participants(sportingId));
    await client.query(otherSession.participants(sportingId));
    const firstTimestamp = client.getQueryState(
      queries.participants(sportingId).queryKey,
    )?.dataUpdatedAt;
    const secondTimestamp = client.getQueryState(
      queries.participants(secondPoolId).queryKey,
    )?.dataUpdatedAt;
    const calls = mockFetch.mock.calls.length;
    clock.mockReturnValue(1_790_000_001_000);

    // When
    await expect(client.query(queries.team(sportingId))).rejects.toMatchObject({
      kind: "http",
      status,
    });

    // Then
    expect(
      client.getQueryData(queries.participants(sportingId).queryKey),
    ).toEqual({
      ...first,
      items: [retainedParticipant],
    });
    expect(
      client.getQueryData(queries.participants(secondPoolId).queryKey),
    ).toEqual({
      ...second,
      items: [],
    });
    expect(
      client.getQueryData(queries.participants(unrelatedPoolId).queryKey),
    ).toEqual(unrelated);
    expect(
      client.getQueryData(bypassQueries.participants(sportingId).queryKey),
    ).toEqual(first);
    expect(
      client.getQueryData(otherSession.participants(sportingId).queryKey),
    ).toEqual(first);
    expect(
      client.getQueryState(queries.participants(sportingId).queryKey)
        ?.dataUpdatedAt,
    ).toBe(firstTimestamp);
    expect(
      client.getQueryState(queries.participants(secondPoolId).queryKey)
        ?.dataUpdatedAt,
    ).toBe(secondTimestamp);
    expect(mockFetch).toHaveBeenCalledTimes(calls + 1);
  },
);

it("cancels older retained and initial participant reads before either can restore a refused team", async () => {
  // Given
  const clock = jest.spyOn(Date, "now").mockReturnValue(1_790_000_000_000);
  const queries = publicQueries();
  const otherContext = publicQueries();
  const participants: PoolParticipantsResponse = {
    poolId: sportingId,
    items: [refusedParticipant, retainedParticipant],
  };
  mockFetch.mockResolvedValueOnce(Response.json(participants));
  await client.query(queries.participants(sportingId));
  const timestamp = client.getQueryState(
    queries.participants(sportingId).queryKey,
  )?.dataUpdatedAt;
  const retainedRead = Promise.withResolvers<Response>();
  const initialRead = Promise.withResolvers<Response>();
  const otherRead = Promise.withResolvers<Response>();
  let retainedSignal: AbortSignal | undefined;
  let initialSignal: AbortSignal | undefined;
  let otherSignal: AbortSignal | undefined;
  mockFetch
    .mockImplementationOnce((_url: string, options?: RequestInit) => {
      retainedSignal = options?.signal ?? undefined;
      return retainedRead.promise;
    })
    .mockImplementationOnce((_url: string, options?: RequestInit) => {
      initialSignal = options?.signal ?? undefined;
      return initialRead.promise;
    })
    .mockImplementationOnce((_url: string, options?: RequestInit) => {
      otherSignal = options?.signal ?? undefined;
      return otherRead.promise;
    })
    .mockResolvedValue(Response.json({}, { status: 404 }));
  const retained = client
    .query({ ...queries.participants(sportingId), staleTime: 0 })
    .catch(() => undefined);
  await waitFor(() => expect(retainedSignal).toBeDefined());
  const initial = client
    .query(queries.participants(secondPoolId))
    .catch(() => undefined);
  await waitFor(() => expect(initialSignal).toBeDefined());
  const independent = client.query(otherContext.participants(sportingId));
  await waitFor(() => expect(otherSignal).toBeDefined());
  clock.mockReturnValue(1_790_000_001_000);

  // When
  await expect(client.query(queries.team(sportingId))).rejects.toMatchObject({
    status: 404,
  });
  retainedRead.resolve(Response.json(participants));
  initialRead.resolve(Response.json({ ...participants, poolId: secondPoolId }));
  otherRead.resolve(Response.json(participants));
  await Promise.all([retained, initial, independent]);

  // Then
  expect(retainedSignal?.aborted).toBe(true);
  expect(initialSignal?.aborted).toBe(true);
  expect(otherSignal?.aborted).toBe(false);
  expect(
    client.getQueryData(queries.participants(sportingId).queryKey),
  ).toEqual({
    ...participants,
    items: [retainedParticipant],
  });
  expect(
    client.getQueryData(queries.participants(secondPoolId).queryKey),
  ).toBeUndefined();
  expect(
    client.getQueryData(otherContext.participants(sportingId).queryKey),
  ).toEqual(participants);
  expect(
    client.getQueryState(queries.participants(sportingId).queryKey)
      ?.dataUpdatedAt,
  ).toBe(timestamp);
});

it.each(["network", "server"] as const)(
  "retains all participant identities and exact points after an ordinary %s failure",
  async (failure) => {
    // Given
    const queries = publicQueries();
    const participants: PoolParticipantsResponse = {
      poolId: sportingId,
      items: [refusedParticipant, retainedParticipant],
    };
    mockFetch.mockResolvedValueOnce(Response.json(participants));
    await client.query(queries.participants(sportingId));
    if (failure === "network")
      mockFetch.mockRejectedValueOnce(new TypeError("Synthetic offline read"));
    else mockFetch.mockResolvedValueOnce(Response.json({}, { status: 503 }));

    // When
    await expect(client.query(queries.team(sportingId))).rejects.toMatchObject(
      failure === "network"
        ? { kind: "network" }
        : { kind: "http", status: 503 },
    );

    // Then
    expect(
      client.getQueryData(queries.participants(sportingId).queryKey),
    ).toEqual(participants);
  },
);
