import { divisionTextColor } from "../presentation";
import { poolLabel } from "../model/resource-sections";
import { matchDetail } from "../test-support/consultation-data";

it.each([
  ["#000000", "#FFFFFF"],
  ["#FFFFFF", "#000000"],
  ["#245FD8", "#FFFFFF"],
  ["#FFBF00", "#000000"],
  ["#008850", "#000000"],
])("chooses the higher-contrast foreground for %s", (primary, expected) => {
  // Given
  const color = primary;

  // When
  const foreground = divisionTextColor(color);

  // Then
  expect(foreground).toBe(expected);
});

it.each([
  ["Poule A", undefined, "Poule A"],
  ["Poule A", "Phase finale", "Poule A · Phase finale"],
  ["Poule A · Phase finale", "Phase finale", "Poule A · Phase finale"],
])("labels %s with known phase %s once", (name, phaseName, expected) => {
  // Given
  const pool = {
    ...matchDetail().match.pool,
    pool: { id: matchDetail().match.pool.pool.id, name },
    phaseName,
  };

  // When
  const label = poolLabel(pool);

  // Then
  expect(label).toBe(expected);
});
