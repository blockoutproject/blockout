import { Platform } from "react-native";
import { installedVersionStatus } from "../native/installed-version";
import type { AccessSnapshot } from "./access-observations";

/** Chooses the approved maintenance-first presentation without allowing any minimum-version exception. */
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
  const ordinary =
    snapshot.complete !== undefined && version === "satisfied" && !maintenance;
  const gate = maintenance
    ? "maintenance"
    : version === "outdated"
      ? "update"
      : snapshot.checking
        ? "checking"
        : "unavailable";
  return { versions, version, ordinary, gate } as const;
}
