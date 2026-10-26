import { divisionTextColor } from "../presentation";

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
