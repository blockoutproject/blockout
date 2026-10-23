import type { PublicMaintenanceResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";

/**
 * Reads a restriction only after transport validation and the maintenance-specific semantic check.
 * Undefined means unavailable data; it never establishes admission or a minimum-version decision.
 * Callers retain responsibility for session generations and previously observed revisions.
 */
export function readMaintenanceProblem(
  error: unknown,
): PublicMaintenanceResponse | undefined {
  if (
    !(error instanceof ApiError) ||
    error.kind !== "http" ||
    error.status !== 503
  )
    return undefined;
  const problem = error.problem;
  if (
    problem?.type !== "urn:blockout:problem:maintenance" ||
    problem.status !== 503 ||
    !("maintenance" in problem)
  )
    return undefined;
  const maintenance = problem.maintenance;
  if (!maintenance?.active || !maintenance.message?.trim()) return undefined;
  return maintenance;
}
