import type { OwnStreamContributionsResponse } from "../../../../.generated/schemas/index.zod";

/** Synthetic original-account eligibility; each scenario owns its decisive restrictions and versions. */
export function ownContributions(
  overrides: Partial<OwnStreamContributionsResponse> = {},
): OwnStreamContributionsResponse {
  return {
    revision: "initial",
    proposalCount: 0,
    eligibility: { canSubmit: true, requiresApproval: false },
    quota: {
      versionsUsed: 0,
      dailyMatchesUsed: 0,
      matchCountedToday: false,
      dayEndsAt: "2026-10-29T00:00:00+01:00",
    },
    items: [],
    ...overrides,
  };
}
