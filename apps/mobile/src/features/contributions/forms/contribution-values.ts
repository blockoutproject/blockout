import type { ContributionValues } from "../schemas/contribution-schema";

/** Seeds an empty draft or accepts the exact acknowledged address without URL normalization. */
export function contributionValues(url = ""): ContributionValues {
  return { url };
}
