import { poolLabel } from "../model/resource-sections";
import { matchDetail } from "../test-support/consultation-data";

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
