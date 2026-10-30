import { useApplicationAccess } from "./queries/use-application-access";
import { accessPresentation } from "./state/access-presentation";

/**
 * Presents the current F12 minimum-version availability for independently admitted operational UI.
 */
export function useOperationalVersionAdmission() {
  const { snapshot } = useApplicationAccess();
  return {
    satisfied: accessPresentation(snapshot).version === "satisfied",
  };
}
