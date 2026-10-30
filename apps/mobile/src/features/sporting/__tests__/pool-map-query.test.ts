import { createQueryClient } from "../../../shared/query/query-client";
import { createConsultationQueries } from "../api/consultation-queries";
import { sportingId } from "../test-support/consultation-data";

jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const participants = { poolId: sportingId, items: [] };
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it.each([401, 403, 404])(
  "purges the refused participant resource after %i without rewriting other projections",
  async (status) => {
    // Given
    const client = createQueryClient();
    const queries = createConsultationQueries(
      { subject: null, accountId: null },
      { request: (value) => value },
      jest.fn(),
    );
    const options = queries.participants(sportingId);
    mockFetch.mockResolvedValueOnce(Response.json(participants));
    await client.query(options);
    mockFetch.mockResolvedValueOnce(Response.json({}, { status }));
    try {
      // When
      const read = client.query(options);

      // Then
      await expect(read).rejects.toMatchObject({ kind: "http", status });
      expect(client.getQueryData(options.queryKey)).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    } finally {
      client.clear();
    }
  },
);

it.each(["network", "server"])(
  "retains authorized participants after an ordinary %s failure",
  async (failure) => {
    // Given
    const client = createQueryClient();
    const queries = createConsultationQueries(
      { subject: null, accountId: null },
      { request: (value) => value },
      jest.fn(),
    );
    const options = queries.participants(sportingId);
    mockFetch.mockResolvedValueOnce(Response.json(participants));
    await client.query(options);
    if (failure === "network")
      mockFetch.mockRejectedValueOnce(new TypeError("Unavailable"));
    else mockFetch.mockResolvedValueOnce(Response.json({}, { status: 503 }));
    try {
      // When
      const read = client.query(options);

      // Then
      await expect(read).rejects.toMatchObject({
        kind: failure === "network" ? "network" : "http",
      });
      expect(client.getQueryData(options.queryKey)).toEqual(participants);
    } finally {
      client.clear();
    }
  },
);
