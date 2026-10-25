import { File } from "expo-file-system";
import * as Sentry from "@sentry/react-native";

/** Deletes an explicitly app-owned file or URI; callers retain active loans/uploads and never pass borrowed library sources. */
export function deleteOwnedImage(file: File | string | undefined) {
  if (!file) return;
  try {
    const owned = typeof file === "string" ? new File(file) : file;
    if (owned.exists) owned.delete();
  } catch {
    // Native errors can contain private file paths; cleanup failure must not break navigation/session teardown.
    Sentry.captureException(new Error("Owned image cleanup failed"));
  }
}
