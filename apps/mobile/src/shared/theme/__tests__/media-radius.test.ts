import { mediaRadius } from "../media-radius";

it.each([
  [16, 4],
  [16.1, 6],
  [24, 6],
  [24.1, 8],
  [26.67, 8],
  [32, 8],
  [32.1, 12],
  [48, 12],
  [48.1, 16],
  [64, 16],
  [64.1, 18],
])(
  "maps a %s-point media frame to the published %s-point radius",
  (size, radius) => {
    // Given: the table supplies the real frame size, including the inset 32-point logo bitmap.

    // When
    const selected = mediaRadius(size);

    // Then
    expect(selected).toBe(radius);
  },
);
