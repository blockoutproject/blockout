import type { AccountPermissionsResponse } from "../../../.generated/schemas/index.zod";

/** Checks the catalogue's three alternative grants; callers retain current-session and version admission. */
export function canReadDivisions(
  permissions: AccountPermissionsResponse | undefined,
): boolean {
  return (
    permissions?.manageSportingClassification === true ||
    permissions?.manageDivisionLifecycle === true ||
    permissions?.manageSportingPresentation === true
  );
}
