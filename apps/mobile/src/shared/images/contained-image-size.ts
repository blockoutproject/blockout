/** Native decoded pixels or measured logical viewport bounds; only their aspect and fit are used. */
export interface ImageDimensions {
  width: number;
  height: number;
}

/** Fits the entire decoded image inside a measured viewport without cropping or distortion; unmeasured bounds have no frame. */
export function containedImageSize(
  image: ImageDimensions,
  viewport: ImageDimensions,
): ImageDimensions | undefined {
  if (
    image.width <= 0 ||
    image.height <= 0 ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    return undefined;
  }
  const scale = Math.min(
    viewport.width / image.width,
    viewport.height / image.height,
  );
  return { width: image.width * scale, height: image.height * scale };
}
