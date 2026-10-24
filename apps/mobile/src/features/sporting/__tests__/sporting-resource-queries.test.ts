import { onlineManager } from "@tanstack/react-query";
import { createConsultationQueries } from "../api/consultation-queries";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import { createQueryClient } from "../../../shared/query/query-client";
import { sportingId, matchDetail } from "../test-support/consultation-data";

const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => onlineManager.setOnline(true));
afterAll(() => {
  process.env.EXPO_PUBLIC_API_URL = originalUrl;
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
    const result = await client.fetchQuery(
      queries.teamLogo(sportingId, "automatic"),
    );

    // Then
    expect(await result.text()).toBe("synthetic-image");
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
          ? client.fetchQuery(queries.team(sportingId))
          : client.fetchQuery(queries.pool(sportingId));

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
    const result = client.fetchQuery(options);

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
    const result = await client.fetchQuery(publicQueries().match(sportingId));

    // Then
    expect(result.match.schedule.localDate).toBe("2026-10-25");
    expect(result.match.schedule.timeZone).toBeUndefined();
    expect(result.match.schedule.instant).toBeUndefined();
  } finally {
    client.clear();
  }
});
