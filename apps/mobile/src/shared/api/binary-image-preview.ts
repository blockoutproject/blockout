import { ApiError } from "./api-fetch";

/** Converts a successful response once in its Query owner; cancellation aborts the native read and releases listeners. */
export function binaryImagePreview(
  blob: Blob,
  signal?: AbortSignal | null,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError("cancelled"));
      return;
    }
    const reader = new FileReader();

    /** Every terminal path releases both the native reader and its request subscription. */
    function cleanup() {
      signal?.removeEventListener("abort", cancel);
      reader.onload = null;
      reader.onerror = null;
    }

    /** An obsolete request cannot publish a decoded image even if its HTTP body already completed. */
    function cancel() {
      cleanup();
      if (reader.readyState === FileReader.LOADING) reader.abort();
      reject(new ApiError("cancelled"));
    }

    reader.onerror = () => {
      cleanup();
      reject(new ApiError("network"));
    };
    reader.onload = () => {
      cleanup();
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new ApiError("schema"));
    };
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      reader.readAsDataURL(blob);
    } catch {
      cleanup();
      reject(new ApiError("network"));
    }
  });
}
