import type { OwnStreamContributionsResponse } from "../../../../.generated/schemas/index.zod";

/** Synthetic owner context; supplied items keep their active projection coherent unless a scenario explicitly overrides it. */
export function ownContributions(
  overrides: Partial<OwnStreamContributionsResponse> = {},
): OwnStreamContributionsResponse {
  const activeContribution = overrides.items?.find(
    (item) => item.state === "active",
  );
  return {
    ...(activeContribution ? { activeContribution } : {}),
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
