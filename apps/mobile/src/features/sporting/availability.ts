import { useConsultationQueries } from "./api/use-consultation-queries";

/**
 * Narrow public sporting-refusal boundary for independently loaded public representations.
 * Uses the existing session/admission context and target cleanup; it introduces no stored refusal state.
 */
export function useSportingTargetAvailability() {
  return useConsultationQueries().rejectTarget;
}
