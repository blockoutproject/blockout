import { ApiError } from "../../shared/api/api-fetch";
import { useApplicationAccess } from "./queries/use-application-access";
import { accessPresentation } from "./state/access-presentation";

/**
 * Rechecks the existing F12 minimum immediately before independently admitted operational I/O.
 * Callers retain their own session/grant checks; an already sent command keeps its normal outcome.
 */
export function useOperationalVersionAdmission() {
  const { observations, snapshot } = useApplicationAccess();
  return {
    satisfied: accessPresentation(snapshot).version === "satisfied",
    /** Reads current observations after asynchronous credentials, without granting a maintenance/version bypass. */
    assertCurrent() {
      if (
        accessPresentation(observations.getSnapshot()).version !== "satisfied"
      )
        throw new ApiError("cancelled");
    },
  };
}
