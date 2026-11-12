import { containedImageSize } from "../contained-image-size";

it.each([
  {
    name: "landscape",
    image: { width: 1600, height: 900 },
    viewport: { width: 360, height: 640 },
    expected: { width: 360, height: 202.5 },
  },
  {
    name: "portrait",
    image: { width: 900, height: 1600 },
    viewport: { width: 390, height: 600 },
    expected: { width: 337.5, height: 600 },
  },
  {
    name: "square",
    image: { width: 100, height: 100 },
    viewport: { width: 390, height: 600 },
    expected: { width: 390, height: 390 },
  },
])(
  "fits the entire $name image without cropping or distortion",
  ({ image, viewport, expected }) => {
    // Given: decoded source dimensions and a measured native viewport.

    // When
    const frame = containedImageSize(image, viewport);

    // Then
    expect(frame).toEqual(expected);
  },
);

it.each([
  { image: { width: 0, height: 0 }, viewport: { width: 390, height: 600 } },
  { image: { width: 1600, height: 900 }, viewport: { width: 0, height: 0 } },
])(
  "waits for both decoded dimensions and a measured viewport: %j",
  ({ image, viewport }) => {
    // Given: either native decoding or viewport measurement has not completed.

    // When
    const frame = containedImageSize(image, viewport);

    // Then
    expect(frame).toBeUndefined();
  },
);
