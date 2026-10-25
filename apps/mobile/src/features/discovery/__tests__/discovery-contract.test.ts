import {
  listClubs,
  listTeams,
  getSportingSearchOptions,
  getListClubsQueryOptions,
} from "../../../../.generated/mobile";
import { createQueryClient } from "../../../shared/query/query-client";
import { createDiscoveryContext } from "../api/discovery-context";

const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const id = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("admits additive fields while preserving absent optional values", async () => {
  // Given
  mockFetch.mockResolvedValue(
    Response.json({
      clubs: [{ club: { id, name: "Club", future: true }, future: true }],
      future: true,
    }),
  );

  // When
  const result = await listClubs();

  // Then
  expect(result.clubs[0].city).toBeUndefined();
  expect(result.nextCursor).toBeUndefined();
});

it.each([
  { clubs: null },
  { clubs: [{ club: { id, name: 1 } }] },
  { clubs: [], nextCursor: null },
  {},
  { clubs: [], nextCursor: "" },
])("rejects invalid known fields before Query admission: %j", async (body) => {
  // Given
  mockFetch.mockResolvedValue(Response.json(body));
  const cache = createQueryClient();
  const options = getListClubsQueryOptions();

  // When
  const result = cache.query(options);

  // Then
  await expect(result).rejects.toMatchObject({ kind: "schema" });
  expect(cache.getQueryData(options.queryKey)).toBeUndefined();
  cache.clear();
});

it("rejects unknown sporting enums in generated responses", async () => {
  // Given
  mockFetch.mockResolvedValue(
    Response.json({
      resourceType: "team",
      seasons: [],
      divisions: [],
      formats: ["future"],
      genders: [],
    }),
  );

  // When
  const result = getSportingSearchOptions({ resourceType: "team" });

  // Then
  await expect(result).rejects.toMatchObject({ kind: "schema" });
});

it("encodes repeated UUID examples in their selected order", async () => {
  // Given
  const second = "00000000-0000-4000-8000-000000000002";
  mockFetch.mockResolvedValue(Response.json({ clubs: [] }));
  const context = createDiscoveryContext("club", { exampleIds: [second, id] });

  // When
  await listClubs(context.params);

  // Then
  expect(
    new URL(mockFetch.mock.calls[0][0]).searchParams.getAll("exampleIds"),
  ).toEqual([second, id]);
});

it.each(["🏐", "İ"])(
  "sends 200 Unicode characters without rewriting them: %s",
  async (character) => {
    // Given
    const text = character.repeat(200);
    mockFetch.mockResolvedValue(Response.json({ teams: [] }));

    // When
    const context = createDiscoveryContext("team", { q: text });
    await listTeams(context.params);

    // Then
    expect(context.params.q).toBe(text);
    expect(new URL(mockFetch.mock.calls[0][0]).searchParams.get("q")).toBe(
      text,
    );
  },
);

it.each(["x".repeat(201), "🏐".repeat(201), "x".repeat(200) + "\n"])(
  "rejects over-limit Unicode input",
  (q) => {
    // Given
    // The table supplies an input beyond the Unicode limit.

    // When
    const create = () => createDiscoveryContext("team", { q });

    // Then
    expect(create).toThrow();
  },
);

it.each([
  { q: "Volley", exampleIds: [id] },
  { cursor: "opaque" },
  { q: "Volley", exampleIds: [id], cursor: "opaque" },
  { exampleIds: [id, id] },
  {
    exampleIds: [
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA",
    ],
  },
  { exampleIds: [] },
  { q: "\uFEFF", exampleIds: [id] },
])("rejects invalid parameter combinations: %j", (params) => {
  // Given
  // Each table entry violates the example or continuation mode.

  // When
  const create = () => createDiscoveryContext("team", params);

  // Then
  expect(create).toThrow();
});

it("keeps normalized search context separate from pagination", () => {
  // Given
  const first = createDiscoveryContext("team", { q: "  ÉTOILE\tVolley  " });

  // When
  const next = createDiscoveryContext("team", {
    q: "  ÉTOILE\tVolley  ",
    cursor: "opaque",
  });

  // Then
  expect(first.params.q).toBe("  ÉTOILE\tVolley  ");
  expect(first.queryKey).toEqual(next.queryKey);
  expect(first.queryKey).toEqual(
    createDiscoveryContext("team", { q: "étoile volley" }).queryKey,
  );
});

it.each(["\u0000", "\u001c", "\ufeff"])(
  "preserves non-whitespace control or format character %j in the key",
  (control) => {
    // Given
    const input = `\u2003${control}Volley${control}\u00a0`;

    // When
    const context = createDiscoveryContext("team", { q: input });

    // Then
    expect(context.params.q).toBe(input);
    expect(context.queryKey).toEqual(
      createDiscoveryContext("team", { q: `${control}volley${control}` })
        .queryKey,
    );
    expect(context.queryKey).not.toEqual(
      createDiscoveryContext("team", { q: "volley" }).queryKey,
    );
  },
);

it("folds Unicode whitespace without changing the submitted text", () => {
  // Given
  const input = "\u2003Volley\u0085\u00a0Club\t";

  // When
  const context = createDiscoveryContext("team", { q: input });

  // Then
  expect(context.params.q).toBe(input);
  expect(context.queryKey).toEqual(
    createDiscoveryContext("team", { q: "volley club" }).queryKey,
  );
});
