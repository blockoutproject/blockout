import type { ApplicationAccessResponse } from "../../../../.generated/schemas/index.zod";

/** Builds a fresh complete public snapshot; tests explicitly change scenario-specific values. */
export function applicationAccessResponse(): ApplicationAccessResponse {
  return {
    maintenance: { revision: 0, active: false, message: null, imageUrl: null },
    versions: {
      revision: 0,
      ios: { minimumVersion: null, storeUrl: null },
      android: { minimumVersion: null, storeUrl: null },
      message: null,
    },
  };
}
