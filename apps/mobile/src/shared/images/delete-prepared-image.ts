import type { File } from "expo-file-system";
import * as Sentry from "@sentry/react-native";

/** Deletes only an app-owned prepared copy; callers must retain files still consumed by an upload and never pass picker originals. */
export function deletePreparedImage(file: File | undefined) {
  if (!file) return;
  try {
    if (file.exists) file.delete();
  } catch {
    // Native errors can contain private file paths; cleanup failure must not break navigation/session teardown.
    Sentry.captureException(new Error("Prepared image cleanup failed"));
  }
}
