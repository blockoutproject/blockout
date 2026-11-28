/** Distinguishes a known byte limit from other rejected image inputs. */
export class ImageValidationError extends Error {
  constructor(readonly reason: "too-large" | "invalid") {
    super("Choose a PNG or JPEG up to 5 MiB.");
  }
}
