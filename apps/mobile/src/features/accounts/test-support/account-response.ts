import type { AccountResponse } from "../../../../.generated/schemas/index.zod";

/** Builds a synthetic private account response; scenarios override identity, editable fields and capabilities explicitly. */
export function accountResponse(
  overrides: Partial<AccountResponse> = {},
): AccountResponse {
  return {
    accountId: "00000000-0000-4000-8000-000000000001",
    username: "Original",
    email: "owner@example.invalid",
    principalCreatedAt: null,
    hasPhoto: false,
    permissions: {
      manageMaintenance: false,
      manageApplicationVersions: false,
      bypassMaintenance: false,
      manageSportingPresentation: false,
      manageSportingClassification: false,
      manageDivisionLifecycle: false,
      manageCollection: false,
      moderateStreamLinks: false,
    },
    ...overrides,
  };
}
