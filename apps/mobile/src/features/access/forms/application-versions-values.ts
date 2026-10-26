import type { ApplicationVersionsResponse } from "../../../../.generated/schemas/index.zod";
import type { ApplicationVersionsValues } from "../schemas/application-versions-schema";

/** Maps absent transport values into explicit editing strings, without creating publishable defaults. */
export function applicationVersionsValues(
  settings: ApplicationVersionsResponse,
): ApplicationVersionsValues {
  return {
    ios: {
      minimumVersion: settings.ios.minimumVersion ?? "",
      storeUrl: settings.ios.storeUrl ?? "",
    },
    android: {
      minimumVersion: settings.android.minimumVersion ?? "",
      storeUrl: settings.android.storeUrl ?? "",
    },
    message: settings.message ?? "",
  };
}
