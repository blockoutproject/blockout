import { searchResults, uniqueSearchResults } from "../model/search-result";

it("keeps namesakes and updates a repeated UUID without moving its original position", () => {
  // Given: UUID casing does not create another sporting identity after a live index change.
  const id = "aaaaaaaa-0000-4000-8000-000000000001";
  const namesake = "bbbbbbbb-0000-4000-8000-000000000002";

  // When
  const results = uniqueSearchResults([
    {
      clubs: [
        { club: { id, name: "Volley" }, city: "Lyon" },
        { club: { id: namesake, name: "Volley" }, city: "Niort" },
      ],
      nextCursor: "next",
    },
    {
      clubs: [{ club: { id: id.toUpperCase(), name: "Volley actuel" } }],
    },
  ]);

  // Then: the current absence of city replaces its earlier value, without name-based merging.
  expect(results.map(({ identity, city }) => [identity.name, city])).toEqual([
    ["Volley actuel", undefined],
    ["Volley", "Niort"],
  ]);
});

it("maps only generated public context and leaves unavailable relationships absent", () => {
  // Given
  const id = "00000000-0000-4000-8000-000000000001";
  const season = { id, label: "2026/2027", startYear: 2026 };

  // When
  const [team] = searchResults({
    teams: [
      {
        team: { id, name: "Équipe pro" },
        season,
        classification: {},
        professional: true,
      },
    ],
  });
  const [pool] = searchResults({
    pools: [
      {
        pool: { id, name: "Poule A" },
        season,
        classification: {},
        competitionName: "Ligue",
        phaseName: "Finale",
      },
    ],
  });

  // Then
  expect(team).toEqual({
    kind: "team",
    identity: { id, name: "Équipe pro" },
    season,
    classification: {},
    subtitle: undefined,
  });
  expect(pool.subtitle).toBe("Ligue · Finale");
  expect(uniqueSearchResults(undefined)).toEqual([]);
});
