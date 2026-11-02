import {
  standingColumnLabel,
  standingPointsColumn,
} from "../model/standing-columns";

it.each([
  [["Pts", "Jou.", "Gag.", "Per."], "Pts"],
  [["Ratio", "Pts"], "Pts"],
  [["Jou.", "Per."], undefined],
] as const)(
  "selects the published points column from %j",
  (columns, expected) => {
    // Given
    const published = columns;

    // When
    const points = standingPointsColumn(published);

    // Then
    expect(points).toBe(expected);
  },
);

it.each([
  ["Jou.", "J"],
  ["Gag.", "G"],
  ["Per.", "P"],
  ["Matchs / Joués", "J"],
  ["Matchs / Gagnés", "G"],
  ["Matchs / Perdus", "P"],
  ["Pts", "Pts"],
  ["Ratio", "Ratio"],
])("presents column %s as %s", (column, expected) => {
  // Given
  const published = column;

  // When
  const label = standingColumnLabel(published);

  // Then
  expect(label).toBe(expected);
});
