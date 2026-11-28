import { uniqueSearchResults } from "../model/search-result";

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
