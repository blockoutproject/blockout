import { onlineManager } from "@tanstack/react-query";
import { binaryImagePreview } from "../../../shared/api/binary-image-preview";
import { createConsultationQueries } from "../api/consultation-queries";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { createQueryClient } from "../../../shared/query/query-client";
import { sportingId, matchDetail } from "../test-support/consultation-data";

const mockFetch = jest.fn();
// Native decoding is controlled; generated HTTP requests, cancellation and Query caching remain real.
jest.mock("../../../shared/api/binary-image-preview", () => ({
  binaryImagePreview: jest.fn(async () => "data:image/png;base64,c3ludGhldGlj"),
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  onlineManager.setOnline(true);
  jest.restoreAllMocks();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

/** Uses real session and admission preparation while controlling only the network boundary. */
function publicQueries() {
  const session = createSessionGeneration();
  return createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    { request: (options) => options },
    jest.fn(),
  );
}

it("keeps automatic and effective logo selections in distinct generated query entries", async () => {
  // Given
  const queries = publicQueries();
  const client = createQueryClient();
  mockFetch.mockResolvedValue(
    new Response("synthetic-image", {
      headers: { "Content-Type": "image/png" },
    }),
  );
  try {
    // When
    const result = await client.query(
      queries.teamLogo(sportingId, "automatic"),
    );

    // Then
    expect(result).toBe("data:image/png;base64,c3ludGhldGlj");
    expect(mockFetch.mock.calls[0][0]).toContain("selection=automatic");
    expect(queries.teamLogo(sportingId, "automatic").queryKey).not.toEqual(
      queries.teamLogo(sportingId, "effective").queryKey,
    );
  } finally {
    client.clear();
  }
});

it.each(["team", "pool"] as const)(
  "rejects an invalid %s representation before successful cache admission",
  async (kind) => {
    // Given
    const client = createQueryClient();
    const queries = publicQueries();
    const options =
      kind === "team" ? queries.team(sportingId) : queries.pool(sportingId);
    mockFetch.mockResolvedValue(Response.json({ [kind]: { id: sportingId } }));
    try {
      // When
      const result =
        kind === "team"
          ? client.query(queries.team(sportingId))
          : client.query(queries.pool(sportingId));

      // Then
      await expect(result).rejects.toMatchObject({ kind: "schema" });
      expect(client.getQueryData(options.queryKey)).toBeUndefined();
    } finally {
      client.clear();
    }
  },
);

it("attempts an offline public read once without replaying on reconnect", async () => {
  // Given
  const client = createQueryClient();
  const options = publicQueries().clubTeams(sportingId, sportingId);
  onlineManager.setOnline(false);
  mockFetch.mockRejectedValue(new TypeError("synthetic offline"));
  try {
    // When
    const result = client.query(options);

    // Then
    await expect(result).rejects.toMatchObject({ kind: "network" });
    onlineManager.setOnline(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(options.queryKey)?.fetchStatus).toBe("idle");
  } finally {
    client.clear();
  }
});

it("accepts an owner date without inventing a missing source time zone", async () => {
  // Given
  const client = createQueryClient();
  const body = matchDetail();
  const schedule = { ...body.match.schedule };
  delete schedule.timeZone;
  mockFetch.mockResolvedValue(
    Response.json({ ...body, match: { ...body.match, schedule } }),
  );
  try {
    // When
    const result = await client.query(publicQueries().match(sportingId));

    // Then
    expect(result.match.schedule.localDate).toBe("2026-10-25");
    expect(result.match.schedule.timeZone).toBeUndefined();
    expect(result.match.schedule.instant).toBeUndefined();
  } finally {
    client.clear();
  }
});

it("cancels a prepared logo preview when its captured maintenance bypass ends", async () => {
  // Given: generated binary transport and Query are real; native conversion completion is controlled.
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, sportingId);
  const intent = new AbortController();
  const client = createQueryClient();
  const options = createConsultationQueries(
    { ...session.getSnapshot(), isCurrent: session.isCurrent },
    {
      bypass: {
        ...session.getSnapshot(),
        intentId: "logo-preview",
        signal: intent.signal,
      },
      request: (request) => ({
        ...request,
        signal: request.signal
          ? AbortSignal.any([request.signal, intent.signal])
          : intent.signal,
      }),
    },
    async () => ({ accessToken: "synthetic-token" }),
  ).clubLogo(sportingId);
  const converting = Promise.withResolvers<AbortSignal | null | undefined>();
  const conversion = Promise.withResolvers<string>();
  jest.mocked(binaryImagePreview).mockImplementationOnce((_blob, signal) => {
    converting.resolve(signal);
    return conversion.promise;
  });
  mockFetch.mockResolvedValue(
    new Response("synthetic-image", {
      headers: { "Content-Type": "image/png" },
    }),
  );
  const result = client.query(options);
  const rejected = expect(result).rejects.toMatchObject({ kind: "cancelled" });
  const signal = await converting.promise;
  try {
    // When
    intent.abort();
    conversion.resolve("data:image/png;base64,c3ludGhldGlj");

    // Then
    await rejected;
    expect(signal?.aborted).toBe(true);
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    client.clear();
  }
});
