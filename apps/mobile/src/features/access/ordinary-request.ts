import { ApiError, type ApiFetchOptions } from "../../shared/api/api-fetch";
import { useApplicationAccess } from "./queries/use-application-access";
import { accessPresentation } from "./state/access-presentation";

/** Adds explicit maintenance intent; each backend request still owns current authorization. */
export function useOrdinaryRequest() {
  const {
    bypass: choice,
    snapshot,
    clearBypass,
    invalidate,
  } = useApplicationAccess();
  const bypass = snapshot.maintenance?.active ? choice : undefined;
  return {
    admitted: accessPresentation(snapshot, bypass !== undefined).ordinary,
    bypass,
    /** Uses ordinary HTTP refusal and invalidation instead of a client revision/refusal ledger. */
    request(options: ApiFetchOptions): ApiFetchOptions {
      const headers = new Headers(options.headers);
      headers.delete("Blockout-Maintenance-Bypass");
      if (bypass) {
        if (!headers.has("Authorization")) throw new ApiError("http", 401);
        headers.set("Blockout-Maintenance-Bypass", "true");
      }
      return {
        ...options,
        headers,
        onHttpError(error) {
          if ([401, 403, 503].includes(error.status ?? 0)) {
            clearBypass();
            void invalidate();
          }
        },
      };
    },
  };
}
