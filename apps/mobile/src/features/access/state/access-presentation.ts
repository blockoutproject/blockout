import { Platform } from "react-native";
import { installedVersionStatus } from "../native/installed-version";
import type {
  ApplicationAccessResponse,
  PublicMaintenanceResponse,
  ApplicationVersionsResponse,
} from "../../../../.generated/schemas/index.zod";

/** Render-time composition only; neither complete response nor checking is stored outside Query. */
export interface AccessSnapshot {
  maintenance?: PublicMaintenanceResponse;
  versions?: ApplicationVersionsResponse;
  complete?: ApplicationAccessResponse;
  checking?: boolean;
  error?: unknown;
}

/** A failed complete read stays closed; confirmed configuration presents maintenance before update. */
export function accessPresentation(
  snapshot: AccessSnapshot,
  bypassing = false,
) {
  const versions =
    Platform.OS === "ios" ? snapshot.versions?.ios : snapshot.versions?.android;
  const version = versions
    ? installedVersionStatus(versions.minimumVersion)
    : "unavailable";
  const maintenance = snapshot.maintenance?.active === true && !bypassing;
  const failed = snapshot.error != null;
  const ordinary =
    snapshot.complete !== undefined &&
    !failed &&
    version === "satisfied" &&
    !maintenance;
  let gate: "maintenance" | "update" | "checking" | "unavailable" =
    "unavailable";
  if (failed) {
    gate = "unavailable";
  } else if (maintenance) {
    gate = "maintenance";
  } else if (version === "outdated") {
    gate = "update";
  } else if (snapshot.checking && !snapshot.complete) {
    gate = "checking";
  }
  return { versions, version, ordinary, gate } as const;
}
