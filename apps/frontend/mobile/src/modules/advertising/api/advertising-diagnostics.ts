import { Platform } from "react-native";

export type AdvertisingOperation =
  | "consent"
  | "initialization"
  | "load"
  | "privacy-options"
  | "show"
  | "user-action";

export type AdvertisingPlacement = "external-link" | "navigation";

type AdvertisingFailure = {
  operation: AdvertisingOperation;
  outcome: "failed" | "partial" | "retrying" | "timed-out";
  errorCode: string;
  placement?: AdvertisingPlacement;
  durationMs?: number;
  retry?: number;
  consentAvailable?: boolean;
  adapterReadiness?: { name: string; ready: boolean }[];
};

/**
 * Converts an unknown native failure into a bounded provider-safe code.
 */
export function mapAdvertisingError(error: unknown, fallback: string): string {
  const candidate =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : error instanceof Error
        ? error.name
        : fallback;

  const normalized = candidate.replace(/[^a-zA-Z0-9._/-]/g, "-").slice(0, 64);
  return normalized || fallback;
}

/**
 * Reports an actionable advertising-boundary degradation without provider
 * payloads, inventory identifiers, consent strings, or personal data.
 */
export function reportAdvertisingFailure(failure: AdvertisingFailure) {
  console.warn("[advertising]", {
    ...failure,
    errorDomain: "google-mobile-ads",
    format: failure.placement ? "interstitial" : undefined,
    platform: Platform.OS,
    durationMs:
      failure.durationMs === undefined
        ? undefined
        : Math.min(Math.max(failure.durationMs, 0), 60_000),
  });
}
